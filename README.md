# App Banco de Horas y Auditorías (V1.0 - Alpha)

Este es el proyecto inicial generado basado en tus requerimientos.
Incluye el Backend (Node.js + Express + PostgreSQL) y el Frontend (React + Vite + TailwindCSS).

## Requisitos previos
- Node.js instalado (v16+)

## Instrucciones para ejecutar:

### 1. Iniciar el Backend (Base de datos y API)
Abre una terminal en la carpeta `backend` y ejecuta:
```bash
npm install
npm start
```
*El servidor correrá en http://localhost:3001. La base de datos SQLite (bancohoras.db) se creará automáticamente.*

### 2. Iniciar el Frontend (Interfaz de usuario)
Abre otra terminal en la carpeta `frontend` y ejecuta:
```bash
npm install
npm run dev
```
*La aplicación web se abrirá en tu navegador (usualmente http://localhost:5173).*

## Funciones implementadas en esta versión:
- **Diseño Responsive:** Funciona en PC (con menú lateral) y Celular (botón flotante).
- **Colores Institucionales:** Azul, Blanco y Amarillo.
- **Cálculo de horas inteligente:** Convierte internamente horas a minutos. Soporta cruce de medianoche automáticamente (ej: 22:00 a 02:00).
- **Dashboard en tiempo real:** Conexión real a base de datos.
- **Cronómetro Rápido:** Botón de "Iniciar / Finalizar Actividad" que llena el formulario automáticamente.

*Nota: Para llevar este proyecto a producción (VPS/Hosting), se reemplazará SQLite por PostgreSQL y se agregará la autenticación por JWT.*
