const express = require('express');
const cors = require('cors');
const pool = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({ dest: uploadDir });
app.use('/uploads', express.static(uploadDir));

const SECRET_KEY = process.env.SECRET_KEY || "FirmaSecretaBancoHoras2026";

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(`SELECT * FROM usuarios WHERE email = $1`, [email]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
        
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (!isMatch) return res.status(401).json({ error: 'Credenciales inválidas' });
            const token = jwt.sign({ id: user.id, rol: user.rol }, SECRET_KEY, { expiresIn: '12h' });
            delete user.password;
            res.json({ token, user });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener usuarios
app.get('/api/usuarios', async (req, res) => {
    try {
        const result = await pool.query(`SELECT id, nombre, email, cargo, departamento, rol, estado FROM usuarios ORDER BY id DESC`);
        res.json(result.rows || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Crear usuario
app.post('/api/usuarios', async (req, res) => {
    const { nombre, email, password, cargo, departamento, rol } = req.body;
    try {
        const userCheck = await pool.query(`SELECT id FROM usuarios WHERE email = $1`, [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'El correo electrónico ya se encuentra registrado en el sistema.' });
        }

        bcrypt.hash(password, 10, async (err, hash) => {
            if (err) return res.status(500).json({ error: 'Error al encriptar' });
            try {
                const result = await pool.query(
                    `INSERT INTO usuarios (nombre, email, password, cargo, departamento, rol) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, 
                    [nombre, email, hash, cargo, departamento, rol]
                );
                res.json({ success: true, id: result.rows[0].id });
            } catch (dbErr) {
                res.status(500).json({ error: dbErr.message });
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Actualizar usuario (Edición)
app.put('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, email, password, cargo, departamento, rol } = req.body;
    try {
        if (password && password.trim() !== "") {
            bcrypt.hash(password, 10, async (err, hash) => {
                if (err) return res.status(500).json({ error: 'Error al encriptar contraseña' });
                try {
                    await pool.query(
                        `UPDATE usuarios SET nombre=$1, email=$2, password=$3, cargo=$4, departamento=$5, rol=$6 WHERE id=$7`,
                        [nombre, email, hash, cargo, departamento, rol, id]
                    );
                    res.json({ success: true });
                } catch (dbErr) {
                    res.status(500).json({ error: dbErr.message });
                }
            });
        } else {
            await pool.query(
                `UPDATE usuarios SET nombre=$1, email=$2, cargo=$3, departamento=$4, rol=$5 WHERE id=$6`,
                [nombre, email, cargo, departamento, rol, id]
            );
            res.json({ success: true });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Estadísticas
app.get('/api/estadisticas/completas', async (req, res) => {
    const { userId, rol } = req.query;
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
        const usersQuery = `SELECT id, nombre, cargo FROM usuarios WHERE estado = 1`;

        const regRes = await pool.query(regQuery, paramsReg);
        const compRes = await pool.query(compQuery, paramsComp);
        const usersRes = await pool.query(usersQuery);

        res.json({ 
            registrosCompletos: regRes.rows || [], 
            compensacionesCompletas: compRes.rows || [], 
            usuarios: usersRes.rows || [] 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Registros de Horas / Propuestas
app.post('/api/registros', async (req, res) => {
    const { usuario_id, fecha, hora_inicio, hora_termino, horas_generadas_minutos, motivo, actividad, departamento, intervinientes } = req.body;
    try {
        const query = `INSERT INTO registros_horas (usuario_id, fecha, hora_inicio, hora_termino, horas_generadas_minutos, motivo, actividad, departamento, estado) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pendiente') RETURNING id`;
        const values = [usuario_id, fecha, hora_inicio || '', hora_termino || '', horas_generadas_minutos || 0, motivo, actividad, departamento];
        
        const result = await pool.query(query, values);
        const regId = result.rows[0].id;

        if (intervinientes && intervinientes.length > 0) {
            for (const inv of intervinientes) {
                await pool.query(
                    'INSERT INTO intervinientes (registro_id, nombre, cargo, participacion) VALUES ($1, $2, $3, $4)',
                    [regId, inv.nombre, inv.cargo, inv.participacion]
                );
            }
        }
        res.json({ success: true, id: regId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/registros/:id', async (req, res) => {
    const { fecha, hora_inicio, hora_termino, horas_generadas_minutos, motivo, actividad, intervinientes, estado } = req.body;
    const regId = req.params.id;
    try {
        await pool.query(
            `UPDATE registros_horas SET fecha=$1, hora_inicio=$2, hora_termino=$3, horas_generadas_minutos=$4, motivo=$5, actividad=$6, estado=COALESCE($7, estado) WHERE id=$8`,
            [fecha, hora_inicio, hora_termino, horas_generadas_minutos, motivo, actividad, estado || null, regId]
        );

        await pool.query(`DELETE FROM intervinientes WHERE registro_id = $1`, [regId]);
        if (intervinientes && intervinientes.length > 0) {
            for (const inv of intervinientes) {
                await pool.query(
                    'INSERT INTO intervinientes (registro_id, nombre, cargo, participacion) VALUES ($1, $2, $3, $4)',
                    [regId, inv.nombre, inv.cargo, inv.participacion]
                );
            }
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/registros/:id/estado', async (req, res) => {
    try {
        await pool.query(`UPDATE registros_horas SET estado = $1 WHERE id = $2`, [req.body.estado, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/evidencias', upload.single('archivo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
    const url = `/uploads/${req.file.filename}`;
    try {
        await pool.query(
            'INSERT INTO evidencias (registro_id, archivo_url, nombre_archivo) VALUES ($1, $2, $3)', 
            [req.body.registro_id, url, req.file.originalname]
        );
        res.json({ success: true, url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/registros/ultimos', async (req, res) => {
    const { userId, rol } = req.query;
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
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/registros/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const regRes = await pool.query(
            `SELECT r.*, COALESCE(u.nombre, 'Claudio Jaque') as auditor, u.cargo 
             FROM registros_horas r LEFT JOIN usuarios u ON r.usuario_id = u.id WHERE r.id = $1`, 
            [id]
        );
        const registro = regRes.rows[0];
        if (!registro) return res.status(404).json({ error: 'Registro no encontrado' });

        const evRes = await pool.query(`SELECT * FROM evidencias WHERE registro_id = $1`, [id]);
        const intRes = await pool.query(`SELECT * FROM intervinientes WHERE registro_id = $1`, [id]);

        res.json({ 
            ...registro, 
            evidencias: evRes.rows || [], 
            intervinientes: intRes.rows || [] 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Compensaciones
app.post('/api/compensaciones', async (req, res) => {
    const { usuario_id, fecha, horas_compensadas_minutos, motivo, observaciones } = req.body;
    try {
        await pool.query(
            `INSERT INTO compensaciones (usuario_id, fecha, horas_compensadas_minutos, motivo, observaciones) VALUES ($1, $2, $3, $4, $5)`, 
            [usuario_id, fecha, horas_compensadas_minutos, motivo, observaciones]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/compensaciones', async (req, res) => {
    const { userId, rol } = req.query;
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
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend seguro con PostgreSQL ejecutándose en el puerto ${PORT}`));