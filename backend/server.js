const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');
const { Storage } = require('@google-cloud/storage');
const fileUpload = require('express-fileupload');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

// ---------------------------------------------------------
// 1. CONFIGURACIÓN DE SEGURIDAD (CORS, HEADERS Y RATE LIMIT)
// ---------------------------------------------------------
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
    : [];

app.use(cors({
    origin: function (origin, callback) {
        // Permitir peticiones sin origin (apps móviles/Postman) o dominios Vercel/localhost
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.startsWith('http://localhost')) {
            return callback(null, true);
        }
        return callback(new Error('Origen no autorizado por política CORS'));
    },
    credentials: true
}));

// Cabeceras de seguridad HTTP básicas (sin dependencias extra)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

app.use(express.json({ limit: '2mb' }));
app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // Máximo 10 MB por archivo
    abortOnLimit: true,
    responseOnLimit: 'El archivo supera el límite máximo permitido de 10 MB.'
}));

const SECRET_KEY = process.env.SECRET_KEY || "FirmaSecretaBancoHoras2026";
if (!process.env.SECRET_KEY) {
    console.warn("⚠️ ADVERTENCIA DE SEGURIDAD: Configure la variable de entorno SECRET_KEY en Railway.");
}

// Protección contra fuerza bruta en /api/login (10 intentos cada 15 min por IP)
const intentosLogin = new Map();
const rateLimitLogin = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ahora = Date.now();
    const ventanaMs = 15 * 60 * 1000;
    const registro = intentosLogin.get(ip) || { count: 0, inicio: ahora };

    if (ahora - registro.inicio > ventanaMs) {
        registro.count = 0;
        registro.inicio = ahora;
    }

    if (registro.count >= 10) {
        return res.status(429).json({ error: 'Demasiados intentos fallidos. Por seguridad, espere 15 minutos.' });
    }

    registro.count += 1;
    intentosLogin.set(ip, registro);
    next();
};

// ---------------------------------------------------------
// 2. MIDDLEWARES DE AUTENTICACIÓN Y CONTROL DE ROLES
// ---------------------------------------------------------
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Debe iniciar sesión.' });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Sesión expirada o token inválido.' });
        }
        req.user = decoded; // { id, rol }
        next();
    });
};

const soloAdmin = (req, res, next) => {
    if (!req.user || req.user.rol !== 'Administrador') {
        return res.status(403).json({ error: 'Acceso restringido únicamente a Administradores.' });
    }
    next();
};

// ---------------------------------------------------------
// CREACIÓN AUTOMÁTICA DE TABLAS AUXILIARES
// ---------------------------------------------------------
pool.query(`
    CREATE TABLE IF NOT EXISTS notificaciones_leidas (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL,
        notificacion_key VARCHAR(100) NOT NULL,
        fecha_lectura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(usuario_id, notificacion_key)
    )
`).catch(err => console.error('Error verificando tabla notificaciones_leidas:', err.message));

pool.query(`
    CREATE TABLE IF NOT EXISTS solicitudes_compensacion (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL,
        fecha VARCHAR(20) NOT NULL,
        horas_solicitadas_minutos INTEGER NOT NULL,
        motivo VARCHAR(100) NOT NULL,
        observaciones TEXT,
        estado VARCHAR(30) DEFAULT 'Pendiente',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`).catch(err => console.error('Error verificando tabla solicitudes_compensacion:', err.message));

// ---------------------------------------------------------
// CONFIGURACIÓN DE GOOGLE CLOUD STORAGE
// ---------------------------------------------------------
let storage;
if (process.env.GOOGLE_CREDENTIALS_JSON) {
    storage = new Storage({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
    });
} else {
    storage = new Storage({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './gcp-key.json',
    });
}

const bucketName = process.env.GCS_BUCKET_NAME || process.env.GCP_BUCKET_NAME || 'auditorias-asach-evidencias';
const bucket = storage.bucket(bucketName);

// Extensiones permitidas para evidencia
const EXTENSIONES_PERMITIDAS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'];

// ---------------------------------------------------------
// RUTA PÚBLICA: LOGIN
// ---------------------------------------------------------
app.post('/api/login', rateLimitLogin, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Debe ingresar correo y contraseña.' });
    }
    try {
        const result = await pool.query(`SELECT * FROM usuarios WHERE email = $1`, [email.trim().toLowerCase()]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
        
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err || !isMatch) return res.status(401).json({ error: 'Credenciales inválidas' });
            
            // Limpiar contador de intentos fallidos al iniciar sesión con éxito
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
            intentosLogin.delete(ip);

            const token = jwt.sign({ id: user.id, rol: user.rol }, SECRET_KEY, { expiresIn: '12h' });
            delete user.password;
            res.json({ token, user });
        });
    } catch (err) {
        console.error('Error en login:', err.message);
        res.status(500).json({ error: 'Error interno al procesar el inicio de sesión.' });
    }
});

// ---------------------------------------------------------
// RUTAS PROTEGIDAS: USUARIOS (SOLO ADMINISTRADOR)
// ---------------------------------------------------------
app.get('/api/usuarios', verificarToken, soloAdmin, async (req, res) => {
    try {
        const result = await pool.query(`SELECT id, nombre, email, cargo, departamento, rol, estado FROM usuarios ORDER BY id DESC`);
        res.json(result.rows || []);
    } catch (err) {
        console.error('Error listando usuarios:', err.message);
        res.status(500).json({ error: 'Error al obtener la lista de usuarios.' });
    }
});

app.post('/api/usuarios', verificarToken, soloAdmin, async (req, res) => {
    const { nombre, email, password, cargo, departamento, rol } = req.body;
    if (!nombre || !email || !password || password.length < 6) {
        return res.status(400).json({ error: 'Complete todos los campos. La contraseña debe tener al menos 6 caracteres.' });
    }
    try {
        const emailLimpio = email.trim().toLowerCase();
        const userCheck = await pool.query(`SELECT id FROM usuarios WHERE email = $1`, [emailLimpio]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'El correo electrónico ya se encuentra registrado en el sistema.' });
        }

        bcrypt.hash(password, 10, async (err, hash) => {
            if (err) return res.status(500).json({ error: 'Error al procesar seguridad de contraseña.' });
            try {
                const result = await pool.query(
                    `INSERT INTO usuarios (nombre, email, password, cargo, departamento, rol) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, 
                    [nombre.trim(), emailLimpio, hash, cargo || '', departamento || '', rol || 'Auditor']
                );
                res.json({ success: true, id: result.rows[0].id });
            } catch (dbErr) {
                console.error('Error creando usuario:', dbErr.message);
                res.status(500).json({ error: 'No se pudo registrar el usuario.' });
            }
        });
    } catch (err) {
        console.error('Error verificando usuario:', err.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

app.put('/api/usuarios/:id', verificarToken, soloAdmin, async (req, res) => {
    const { id } = req.params;
    const { nombre, email, password, cargo, departamento, rol } = req.body;
    try {
        const emailLimpio = email.trim().toLowerCase();
        if (password && password.trim() !== "") {
            if (password.length < 6) {
                return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
            }
            bcrypt.hash(password, 10, async (err, hash) => {
                if (err) return res.status(500).json({ error: 'Error al encriptar contraseña.' });
                try {
                    await pool.query(
                        `UPDATE usuarios SET nombre=$1, email=$2, password=$3, cargo=$4, departamento=$5, rol=$6 WHERE id=$7`,
                        [nombre.trim(), emailLimpio, hash, cargo || '', departamento || '', rol, id]
                    );
                    res.json({ success: true });
                } catch (dbErr) {
                    console.error('Error actualizando usuario:', dbErr.message);
                    res.status(500).json({ error: 'No se pudo actualizar el usuario.' });
                }
            });
        } else {
            await pool.query(
                `UPDATE usuarios SET nombre=$1, email=$2, cargo=$3, departamento=$4, rol=$5 WHERE id=$6`,
                [nombre.trim(), emailLimpio, cargo || '', departamento || '', rol, id]
            );
            res.json({ success: true });
        }
    } catch (err) {
        console.error('Error en PUT usuario:', err.message);
        res.status(500).json({ error: 'Error interno al actualizar usuario.' });
    }
});

// ---------------------------------------------------------
// RUTAS PROTEGIDAS: ESTADÍSTICAS Y REGISTROS
// ---------------------------------------------------------
app.get('/api/estadisticas/completas', verificarToken, async (req, res) => {
    // Seguridad: Se usa estrictamente el ID y ROL del token JWT, ignorando query params manipulables
    const { id: userId, rol } = req.user;
    try {
        let filterReg = '';
        let filterComp = '';
        let paramsReg = [];
        let paramsComp = [];

        if (rol !== 'Administrador') {
            filterReg = 'WHERE r.usuario_id = $1';
            paramsReg = [userId];
            filterComp = 'WHERE c.usuario_id = $1';
            paramsComp = [userId];
        }

        const regQuery = `SELECT r.*, COALESCE(u.nombre, 'Claudio Jaque') as auditor FROM registros_horas r LEFT JOIN usuarios u ON r.usuario_id = u.id ${filterReg}`;
        const compQuery = `SELECT c.*, COALESCE(u.nombre, 'Claudio Jaque') as auditor FROM compensaciones c LEFT JOIN usuarios u ON c.usuario_id = u.id ${filterComp}`;
        const usersQuery = rol === 'Administrador'
            ? `SELECT id, nombre, cargo, rol FROM usuarios WHERE estado = 1`
            : `SELECT id, nombre, cargo, rol FROM usuarios WHERE id = $1`;

        const regRes = await pool.query(regQuery, paramsReg);
        const compRes = await pool.query(compQuery, paramsComp);
        const usersRes = rol === 'Administrador' ? await pool.query(usersQuery) : await pool.query(usersQuery, [userId]);

        res.json({ 
            registrosCompletos: regRes.rows || [], 
            compensacionesCompletas: compRes.rows || [], 
            usuarios: usersRes.rows || [] 
        });
    } catch (err) {
        console.error('Error en estadísticas:', err.message);
        res.status(500).json({ error: 'Error al cargar estadísticas.' });
    }
});

app.post('/api/registros', verificarToken, async (req, res) => {
    const { fecha, hora_inicio, hora_termino, horas_generadas_minutos, motivo, actividad, departamento, intervinientes } = req.body;
    // Seguridad: Un usuario no administrador solo puede crear registros a su propio nombre
    const usuario_id = (req.user.rol === 'Administrador' && req.body.usuario_id) ? req.body.usuario_id : req.user.id;

    try {
        const query = `INSERT INTO registros_horas (usuario_id, fecha, hora_inicio, hora_termino, horas_generadas_minutos, motivo, actividad, departamento, estado) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pendiente') RETURNING id`;
        const values = [usuario_id, fecha, hora_inicio || '', hora_termino || '', Math.max(0, Number(horas_generadas_minutos) || 0), motivo, actividad, departamento];
        
        const result = await pool.query(query, values);
        const regId = result.rows[0].id;

        if (intervinientes && Array.isArray(intervinientes) && intervinientes.length > 0) {
            for (const inv of intervinientes) {
                await pool.query(
                    'INSERT INTO intervinientes (registro_id, nombre, cargo, participacion) VALUES ($1, $2, $3, $4)',
                    [regId, inv.nombre, inv.cargo, inv.participacion]
                );
            }
        }
        res.json({ success: true, id: regId });
    } catch (err) {
        console.error('Error creando registro:', err.message);
        res.status(500).json({ error: 'No se pudo guardar el registro.' });
    }
});

app.put('/api/registros/:id', verificarToken, async (req, res) => {
    const { fecha, hora_inicio, hora_termino, horas_generadas_minutos, motivo, actividad, intervinientes, estado } = req.body;
    const regId = req.params.id;
    try {
        // Verificar propiedad del registro
        const checkReg = await pool.query(`SELECT usuario_id, estado FROM registros_horas WHERE id = $1`, [regId]);
        const actual = checkReg.rows[0];
        if (!actual) return res.status(404).json({ error: 'Registro no encontrado.' });

        if (req.user.rol !== 'Administrador' && String(actual.usuario_id) !== String(req.user.id)) {
            return res.status(403).json({ error: 'No tiene permisos para editar este registro.' });
        }

        // Seguridad: Un usuario normal no puede auto-aprobarse a 'Aprobado (Pendiente de Ejecución)' directamente
        const estadosPermitidosUsuario = ['Pendiente', 'Revisión por Exceso de Horas', 'Ejecutado'];
        let estadoFinal = estado || null;
        if (req.user.rol !== 'Administrador' && estadoFinal && !estadosPermitidosUsuario.includes(estadoFinal)) {
            estadoFinal = actual.estado;
        }

        await pool.query(
            `UPDATE registros_horas SET fecha=$1, hora_inicio=$2, hora_termino=$3, horas_generadas_minutos=$4, motivo=$5, actividad=$6, estado=COALESCE($7, estado) WHERE id=$8`,
            [fecha, hora_inicio, hora_termino, Math.max(0, Number(horas_generadas_minutos) || 0), motivo, actividad, estadoFinal, regId]
        );

        await pool.query(`DELETE FROM intervinientes WHERE registro_id = $1`, [regId]);
        if (intervinientes && Array.isArray(intervinientes) && intervinientes.length > 0) {
            for (const inv of intervinientes) {
                await pool.query(
                    'INSERT INTO intervinientes (registro_id, nombre, cargo, participacion) VALUES ($1, $2, $3, $4)',
                    [regId, inv.nombre, inv.cargo, inv.participacion]
                );
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error actualizando registro:', err.message);
        res.status(500).json({ error: 'No se pudo actualizar el registro.' });
    }
});

// Eliminar auditoría fallida / no ejecutada
app.delete('/api/registros/:id', verificarToken, async (req, res) => {
    const regId = req.params.id;
    try {
        const checkReg = await pool.query(`SELECT usuario_id, estado FROM registros_horas WHERE id = $1`, [regId]);
        const actual = checkReg.rows[0];
        if (!actual) return res.status(404).json({ error: 'Registro no encontrado.' });

        if (req.user.rol !== 'Administrador' && String(actual.usuario_id) !== String(req.user.id)) {
            return res.status(403).json({ error: 'No tiene permisos para eliminar este registro.' });
        }

        if (req.user.rol !== 'Administrador' && actual.estado === 'Ejecutado') {
            return res.status(403).json({ error: 'No se puede eliminar una auditoría ya ejecutada.' });
        }

        // Eliminar archivos asociados en Google Cloud Storage si existen
        const evRes = await pool.query(`SELECT archivo_url FROM evidencias WHERE registro_id = $1`, [regId]);
        const prefix = `https://storage.googleapis.com/${bucket.name}/`;
        for (const ev of evRes.rows) {
            if (ev.archivo_url && ev.archivo_url.startsWith(prefix)) {
                const filePath = decodeURIComponent(ev.archivo_url.replace(prefix, ''));
                await bucket.file(filePath).delete().catch(err => console.warn('Aviso al borrar en GCS:', err.message));
            }
        }

        await pool.query(`DELETE FROM evidencias WHERE registro_id = $1`, [regId]);
        await pool.query(`DELETE FROM intervinientes WHERE registro_id = $1`, [regId]);
        await pool.query(`DELETE FROM notificaciones_leidas WHERE notificacion_key = $1`, [String(regId)]);
        await pool.query(`DELETE FROM registros_horas WHERE id = $1`, [regId]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error eliminando registro:', err.message);
        res.status(500).json({ error: 'No se pudo eliminar el registro.' });
    }
});

// Aprobar o rechazar (SOLO ADMINISTRADOR)
app.put('/api/registros/:id/estado', verificarToken, soloAdmin, async (req, res) => {
    try {
        await pool.query(`UPDATE registros_horas SET estado = $1 WHERE id = $2`, [req.body.estado, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error cambiando estado:', err.message);
        res.status(500).json({ error: 'Error al cambiar el estado del registro.' });
    }
});

// ---------------------------------------------------------
// RUTA DE EVIDENCIAS CON GOOGLE CLOUD STORAGE (VALIDADA)
// ---------------------------------------------------------
app.post('/api/evidencias', verificarToken, async (req, res) => {
    if (!req.files || !req.files.archivo) {
        return res.status(400).json({ error: 'No se ha adjuntado ningún archivo.' });
    }

    const archivo = req.files.archivo;
    const registro_id = req.body.registro_id;

    if (!registro_id) {
        return res.status(400).json({ error: 'Falta el ID del registro para asociar la evidencia.' });
    }

    // Validar extensión del archivo
    const ext = path.extname(archivo.name).toLowerCase();
    if (!EXTENSIONES_PERMITIDAS.includes(ext)) {
        return res.status(400).json({ error: `Formato de archivo no permitido (${ext}). Use PDF, imágenes, Word o Excel.` });
    }

    try {
        // Verificar que el registro exista y pertenezca al usuario (o sea Admin)
        const regCheck = await pool.query(`SELECT usuario_id FROM registros_horas WHERE id = $1`, [registro_id]);
        if (regCheck.rows.length === 0) {
            return res.status(404).json({ error: 'El registro asociado no existe.' });
        }
        if (req.user.rol !== 'Administrador' && String(regCheck.rows[0].usuario_id) !== String(req.user.id)) {
            return res.status(403).json({ error: 'No tiene permisos para subir archivos a este registro.' });
        }

        // Sanitizar nombre de archivo para evitar path traversal
        const nombreLimpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const nombreUnico = `evidencias/${Date.now()}-${nombreLimpio}`;
        const blob = bucket.file(nombreUnico);

        const blobStream = blob.createWriteStream({
            resumable: false,
            metadata: {
                contentType: archivo.mimetype,
            },
        });

        blobStream.on('error', (err) => {
            console.error('Error al subir a Google Cloud:', err.message);
            return res.status(500).json({ error: 'Error al subir el archivo a Google Cloud.' });
        });

        blobStream.on('finish', async () => {
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
            
            try {
                const evInsert = await pool.query(
                    'INSERT INTO evidencias (registro_id, archivo_url, nombre_archivo) VALUES ($1, $2, $3) RETURNING *', 
                    [registro_id, publicUrl, archivo.name]
                );
                return res.json({ success: true, url: publicUrl, evidencia: evInsert.rows[0] });
            } catch (dbErr) {
                console.error('Error al guardar evidencia en BD:', dbErr.message);
                return res.status(500).json({ error: 'Archivo subido a la nube, pero falló al registrar en la base de datos.' });
            }
        });

        blobStream.end(archivo.data);
    } catch (err) {
        console.error('Error interno en evidencias:', err.message);
        res.status(500).json({ error: 'Error interno al procesar el archivo.' });
    }
});

// Eliminar evidencia (con validación de propiedad)
app.delete('/api/evidencias/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    try {
        const evRes = await pool.query(
            `SELECT e.*, r.usuario_id FROM evidencias e JOIN registros_horas r ON e.registro_id = r.id WHERE e.id = $1`,
            [id]
        );
        const evidencia = evRes.rows[0];
        if (!evidencia) return res.status(404).json({ error: 'Evidencia no encontrada' });

        if (req.user.rol !== 'Administrador' && String(evidencia.usuario_id) !== String(req.user.id)) {
            return res.status(403).json({ error: 'No tiene permisos para eliminar este archivo.' });
        }

        const prefix = `https://storage.googleapis.com/${bucket.name}/`;
        if (evidencia.archivo_url && evidencia.archivo_url.startsWith(prefix)) {
            const filePath = decodeURIComponent(evidencia.archivo_url.replace(prefix, ''));
            await bucket.file(filePath).delete().catch(err => console.warn('Aviso al borrar en GCS:', err.message));
        }

        await pool.query(`DELETE FROM evidencias WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error eliminando evidencia:', err.message);
        res.status(500).json({ error: 'No se pudo eliminar la evidencia.' });
    }
});

app.get('/api/registros/ultimos', verificarToken, async (req, res) => {
    const { id: userId, rol } = req.user;
    try {
        let filter = '';
        let params = [];
        if (rol !== 'Administrador') {
            filter = 'WHERE r.usuario_id = $1';
            params = [userId];
        }

        const query = `
            SELECT r.*, 
            COALESCE(u.nombre, 'Claudio Jaque') as auditor, 
            (SELECT COUNT(*) FROM evidencias WHERE registro_id = r.id) as tiene_evidencia,
            (SELECT COUNT(*) FROM intervinientes WHERE registro_id = r.id) as total_intervinientes
            FROM registros_horas r LEFT JOIN usuarios u ON r.usuario_id = u.id ${filter} ORDER BY r.id DESC LIMIT 100
        `;
        const result = await pool.query(query, params);
        res.json(result.rows || []);
    } catch (err) {
        console.error('Error listando registros:', err.message);
        res.status(500).json({ error: 'Error al obtener registros.' });
    }
});

app.get('/api/registros/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    try {
        const regRes = await pool.query(
            `SELECT r.*, COALESCE(u.nombre, 'Claudio Jaque') as auditor, u.cargo 
             FROM registros_horas r LEFT JOIN usuarios u ON r.usuario_id = u.id WHERE r.id = $1`, 
            [id]
        );
        const registro = regRes.rows[0];
        if (!registro) return res.status(404).json({ error: 'Registro no encontrado' });

        if (req.user.rol !== 'Administrador' && String(registro.usuario_id) !== String(req.user.id)) {
            return res.status(403).json({ error: 'No tiene permisos para ver este registro.' });
        }

        const evRes = await pool.query(`SELECT * FROM evidencias WHERE registro_id = $1 ORDER BY id ASC`, [id]);
        const intRes = await pool.query(`SELECT * FROM intervinientes WHERE registro_id = $1`, [id]);

        res.json({ 
            ...registro, 
            evidencias: evRes.rows || [], 
            intervinientes: intRes.rows || [] 
        });
    } catch (err) {
        console.error('Error obteniendo detalle:', err.message);
        res.status(500).json({ error: 'Error al cargar el detalle del registro.' });
    }
});

// ---------------------------------------------------------
// COMPENSACIONES Y SOLICITUDES DE COMPENSACIÓN
// ---------------------------------------------------------
app.post('/api/compensaciones', verificarToken, soloAdmin, async (req, res) => {
    const { usuario_id, fecha, horas_compensadas_minutos, motivo, observaciones } = req.body;
    try {
        await pool.query(
            `INSERT INTO compensaciones (usuario_id, fecha, horas_compensadas_minutos, motivo, observaciones) VALUES ($1, $2, $3, $4, $5)`, 
            [usuario_id, fecha, Math.max(1, Number(horas_compensadas_minutos) || 0), motivo, observaciones]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error registrando compensación:', err.message);
        res.status(500).json({ error: 'No se pudo registrar la compensación.' });
    }
});

app.get('/api/compensaciones', verificarToken, async (req, res) => {
    const { id: userId, rol } = req.user;
    try {
        let filter = '';
        let params = [];
        if (rol !== 'Administrador') {
            filter = 'WHERE c.usuario_id = $1';
            params = [userId];
        }
        const query = `SELECT c.*, COALESCE(u.nombre, 'Claudio Jaque') as auditor FROM compensaciones c LEFT JOIN usuarios u ON c.usuario_id = u.id ${filter} ORDER BY c.id DESC`;
        const result = await pool.query(query, params);
        res.json(result.rows || []);
    } catch (err) {
        console.error('Error listando compensaciones:', err.message);
        res.status(500).json({ error: 'Error al obtener compensaciones.' });
    }
});

app.get('/api/solicitudes-compensacion', verificarToken, async (req, res) => {
    const { id: userId, rol } = req.user;
    try {
        let filter = '';
        let params = [];
        if (rol !== 'Administrador') {
            filter = 'WHERE s.usuario_id = $1';
            params = [userId];
        }
        const query = `
            SELECT s.*, COALESCE(u.nombre, 'Auditor') as auditor, u.email as auditor_email
            FROM solicitudes_compensacion s
            LEFT JOIN usuarios u ON s.usuario_id = u.id
            ${filter}
            ORDER BY s.id DESC
        `;
        const result = await pool.query(query, params);
        res.json(result.rows || []);
    } catch (err) {
        console.error('Error listando solicitudes de compensación:', err.message);
        res.status(500).json({ error: 'Error al obtener solicitudes de compensación.' });
    }
});

app.post('/api/solicitudes-compensacion', verificarToken, async (req, res) => {
    const { fecha, horas_solicitadas_minutos, motivo, observaciones } = req.body;
    const usuario_id = req.user.id;
    const minutos = Math.max(1, Number(horas_solicitadas_minutos) || 0);

    try {
        const result = await pool.query(
            `INSERT INTO solicitudes_compensacion (usuario_id, fecha, horas_solicitadas_minutos, motivo, observaciones, estado)
             VALUES ($1, $2, $3, $4, $5, 'Pendiente') RETURNING *`,
            [usuario_id, fecha, minutos, motivo, observaciones || '']
        );
        res.json({ success: true, solicitud: result.rows[0] });
    } catch (err) {
        console.error('Error creando solicitud de compensación:', err.message);
        res.status(500).json({ error: 'No se pudo enviar la solicitud de compensación.' });
    }
});

app.put('/api/solicitudes-compensacion/:id/aprobar', verificarToken, soloAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const solRes = await pool.query(`SELECT * FROM solicitudes_compensacion WHERE id = $1`, [id]);
        const solicitud = solRes.rows[0];
        if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada.' });
        if (solicitud.estado !== 'Pendiente') {
            return res.status(400).json({ error: 'Esta solicitud ya fue procesada.' });
        }

        await pool.query(
            `INSERT INTO compensaciones (usuario_id, fecha, horas_compensadas_minutos, motivo, observaciones)
             VALUES ($1, $2, $3, $4, $5)`,
            [solicitud.usuario_id, solicitud.fecha, solicitud.horas_solicitadas_minutos, solicitud.motivo, solicitud.observaciones || '']
        );

        await pool.query(`UPDATE solicitudes_compensacion SET estado = 'Aprobada' WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error aprobando solicitud de compensación:', err.message);
        res.status(500).json({ error: 'No se pudo aprobar la solicitud de compensación.' });
    }
});

app.put('/api/solicitudes-compensacion/:id/rechazar', verificarToken, soloAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(`UPDATE solicitudes_compensacion SET estado = 'Rechazada' WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error rechazando solicitud de compensación:', err.message);
        res.status(500).json({ error: 'No se pudo rechazar la solicitud de compensación.' });
    }
});

// ---------------------------------------------------------
// RUTAS DE NOTIFICACIONES LEÍDAS PERSISTENTES EN BASE DE DATOS
// ---------------------------------------------------------
app.get('/api/notificaciones-leidas/:usuarioId', verificarToken, async (req, res) => {
    // Seguridad: Solo puede consultar sus propias notificaciones
    const targetId = req.user.id;
    try {
        const result = await pool.query(
            `SELECT notificacion_key FROM notificaciones_leidas WHERE usuario_id = $1`,
            [targetId]
        );
        res.json(result.rows.map(r => r.notificacion_key));
    } catch (err) {
        console.error('Error obteniendo notificaciones:', err.message);
        res.status(500).json({ error: 'Error al obtener notificaciones.' });
    }
});

app.post('/api/notificaciones-leidas', verificarToken, async (req, res) => {
    const usuario_id = req.user.id;
    const { notificacion_key } = req.body;
    try {
        await pool.query(
            `INSERT INTO notificaciones_leidas (usuario_id, notificacion_key) 
             VALUES ($1, $2) ON CONFLICT (usuario_id, notificacion_key) DO NOTHING`,
            [usuario_id, String(notificacion_key)]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error guardando notificación:', err.message);
        res.status(500).json({ error: 'Error al marcar notificación como leída.' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend seguro con PostgreSQL, JWT y GCS ejecutándose en el puerto ${PORT}`));