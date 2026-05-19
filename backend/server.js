const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Cargar variables de entorno PRIMERO
dotenv.config();

// Importar rutas DESPUÉS de cargar las variables de entorno
const chatRoutes = require('./routes/chat');
const databaseRoutes = require('./routes/database');
const knowledgeBaseRoutes = require('./routes/knowledgeBase');
const authRoutes = require('./routes/auth');
const notificationRoutes = require('./routes/notifications');
const emailRoutes = require('./routes/email');
const googleCalendarRoutes = require('./routes/googleCalendar');
const calendarEventsRoutes = require('./routes/calendarEvents');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rutas (sin middleware de multer global)
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/google/calendar', googleCalendarRoutes);
app.use('/api/calendar', calendarEventsRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Demo Shark Tank API'
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Región AWS: ${process.env.AWS_REGION || 'us-east-1'}`);
});
