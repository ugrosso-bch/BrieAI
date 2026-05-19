const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// En desarrollo cargar .env antes de todo
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const { loadSecrets } = require('./config/secrets');

async function startServer() {
  // Cargar secrets (en producción desde Secrets Manager, en dev desde .env)
  await loadSecrets();

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
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Rutas
  app.use('/api/auth', authRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/database', databaseRoutes);
  app.use('/api/knowledge-base', knowledgeBaseRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/email', emailRoutes);
  app.use('/api/google/calendar', googleCalendarRoutes);
  app.use('/api/calendar', calendarEventsRoutes);

  // Health check (usado por ALB target group)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'BrieAI API',
      version: process.env.APP_VERSION || '1.0.0'
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📍 Región AWS: ${process.env.AWS_REGION || 'us-east-1'}`);
  });
}

startServer().catch(err => {
  console.error('❌ Error fatal al iniciar el servidor:', err);
  process.exit(1);
});
