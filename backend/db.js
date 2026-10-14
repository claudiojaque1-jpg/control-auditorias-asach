const { Pool } = require('pg');

// Conexión a la base de datos PostgreSQL alojada en Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:QduLRZaPqCgCkgoWkRWSTfjOEPCQvTkX@reseau.proxy.rlwy.net:16708/railway',
  ssl: { rejectUnauthorized: false }
});

// Inicialización y creación automática de tablas en Railway
pool.query(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    cargo VARCHAR(100),
    departamento VARCHAR(100),
    rol VARCHAR(50) DEFAULT 'Auditor',
    estado INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS registros_horas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    fecha VARCHAR(50),
    hora_inicio VARCHAR(10),
    hora_termino VARCHAR(10),
    horas_generadas_minutos INTEGER DEFAULT 0,
    motivo VARCHAR(100),
    actividad TEXT,
    departamento VARCHAR(100),
    estado VARCHAR(50) DEFAULT 'Pendiente'
  );

  CREATE TABLE IF NOT EXISTS intervinientes (
    id SERIAL PRIMARY KEY,
    registro_id INTEGER REFERENCES registros_horas(id) ON DELETE CASCADE,
    nombre VARCHAR(255),
    cargo VARCHAR(100),
    participacion VARCHAR(100)
  );

  CREATE TABLE IF NOT EXISTS evidencias (
    id SERIAL PRIMARY KEY,
    registro_id INTEGER REFERENCES registros_horas(id) ON DELETE CASCADE,
    archivo_url TEXT,
    nombre_archivo TEXT
  );

  CREATE TABLE IF NOT EXISTS compensaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    fecha VARCHAR(50),
    horas_compensadas_minutos INTEGER DEFAULT 0,
    motivo VARCHAR(100),
    observaciones TEXT
  );
`).then(() => {
  console.log("¡Conexión exitosa a Railway! Tablas PostgreSQL verificadas/creadas correctamente.");
}).catch(err => {
  console.error("Error al inicializar las tablas en Railway:", err);
});

module.exports = pool;