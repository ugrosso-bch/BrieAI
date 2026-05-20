const express = require('express');
const router = express.Router();
const multer = require('multer');
const s3Service = require('../services/s3Service');
const syncService = require('../services/knowledgeBaseSyncService');
const dynamoService = require('../services/dynamoService');
const notificationService = require('../services/notificationService');

// Middleware opcional: autenticar si hay token, continuar de todos modos
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.substring(7);
      const authService = require('../services/authService');
      const result = await authService.getUser(accessToken);
      if (result.success) {
        req.user = result.user;
      }
    }
    if (!req.user) {
      req.user = { userId: 'guest' };
    }
    next();
  } catch (error) {
    req.user = { userId: 'guest' };
    next();
  }
};

// Configuración de multer para manejo de archivos
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB límite
    fieldSize: 1024 * 1024 // 1MB para campos de texto
  },
  fileFilter: (req, file, cb) => {
    console.log('Archivo recibido:', file.originalname, 'tipo:', file.mimetype);
    // Permitir tipos comunes de documentos y texto
    const allowedTypes = [
      'text/plain', 'text/csv', 'text/markdown', 'text/x-markdown',
      'text/x-rst', 'text/html',
      'application/json', 'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream'
    ];
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
    }
  }
});

// Obtener todos los archivos de la base de conocimiento
router.get('/files', optionalAuth, async (req, res) => {
  try {
    const result = await s3Service.listFiles(req.user.userId);
    res.json(result);
  } catch (error) {
    console.error('Error obteniendo archivos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Subir archivo a la base de conocimiento
router.post('/upload', optionalAuth, (req, res) => {
  console.log('Iniciando upload...');
  
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Error de multer:', err);
      
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'El archivo es demasiado grande. Máximo 1GB permitido.'
          });
        }
        return res.status(400).json({
          success: false,
          error: `Error de subida: ${err.message}`
        });
      }
      
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }

    try {
      console.log('Archivo recibido:', req.file);
      console.log('Body:', req.body);

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: 'No se proporcionó archivo' 
        });
      }

      const { description, category } = req.body;
      
      const metadata = {
        description: description || '',
        category: category || 'general',
        uploadedBy: 'user',
        fileSize: req.file.size.toString()
      };

      console.log('Subiendo archivo a S3...');
      const result = await s3Service.uploadFile(req.file, req.file.originalname, req.user.userId, metadata);
      
      // Guardar en DynamoDB
      if (result.success) {
        await dynamoService.saveDocument(req.user.userId, {
          fileName: req.file.originalname,
          s3Key: result.key,
          size: result.size,
          contentType: result.contentType,
          description: description || '',
          category: category || 'general'
        });
      }
      
      if (result.success) {
        console.log('Archivo subido exitosamente:', result);
        
        // Enviar notificación
        await notificationService.notifyKnowledgeBaseFileAdded(req.file.originalname, req.file.size);
        
        // 🔄 Sync automático del Knowledge Base
        console.log('🔄 Iniciando sync automático del Knowledge Base...');
        const syncResult = await syncService.syncAfterUpload(req.file.originalname);
        
        res.status(201).json({
          success: true,
          message: 'Archivo subido exitosamente',
          file: {
            key: result.key,
            fileName: result.fileName,
            size: result.size,
            contentType: result.contentType,
            metadata: metadata
          },
          sync: syncResult // Incluir información del sync
        });
      } else {
        console.error('Error en S3Service:', result);
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Error procesando archivo:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor: ' + error.message
      });
    }
  });
});

// Obtener contenido de un archivo específico
router.get('/files/:key', optionalAuth, async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.key);
    const result = await s3Service.getFile(key, req.user.userId);
    
    if (result.success) {
      res.json({
        success: true,
        content: result.content,
        metadata: result.metadata,
        contentType: result.contentType
      });
    } else {
      res.status(404).json(result);
    }

  } catch (error) {
    console.error('Error obteniendo archivo:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Eliminar archivo de la base de conocimiento
router.delete('/files/:key', optionalAuth, async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.key);
    const fileName = key.split('/').pop(); // Extraer nombre del archivo del key
    const result = await s3Service.deleteFile(key, req.user.userId);
    
    if (result.success) {
      // Enviar notificación
      await notificationService.notifyKnowledgeBaseFileRemoved(fileName);
      
      // 🔄 Sync automático del Knowledge Base después de eliminar
      console.log('🔄 Iniciando sync automático después de eliminar archivo...');
      const syncResult = await syncService.syncAfterDelete(key);
      
      res.json({
        ...result,
        sync: syncResult // Incluir información del sync
      });
    } else {
      res.json(result);
    }

  } catch (error) {
    console.error('Error eliminando archivo:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Obtener estadísticas de la base de conocimiento
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const filesResult = await s3Service.listFiles(req.user.userId);
    
    if (!filesResult.success) {
      return res.status(500).json(filesResult);
    }

    const stats = {
      totalFiles: filesResult.files.length,
      totalSize: filesResult.files.reduce((sum, file) => sum + (file.size || 0), 0),
      fileTypes: {},
      lastUpdated: filesResult.files.length > 0 
        ? Math.max(...filesResult.files.map(f => new Date(f.lastModified).getTime()))
        : null
    };

    // Contar tipos de archivo
    filesResult.files.forEach(file => {
      const extension = file.fileName.split('.').pop()?.toLowerCase() || 'unknown';
      stats.fileTypes[extension] = (stats.fileTypes[extension] || 0) + 1;
    });

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Buscar en la base de conocimiento
router.post('/search', optionalAuth, async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Consulta de búsqueda requerida' 
      });
    }

    const filesResult = await s3Service.listFiles(req.user.userId);
    
    if (!filesResult.success) {
      return res.status(500).json(filesResult);
    }

    const searchResults = [];
    
    // Buscar en cada archivo
    for (const file of filesResult.files) {
      try {
        const fileContent = await s3Service.getFile(file.key, req.user.userId);
        
        if (fileContent.success && fileContent.content.toLowerCase().includes(query.toLowerCase())) {
          // Encontrar contexto alrededor de la coincidencia
          const content = fileContent.content;
          const index = content.toLowerCase().indexOf(query.toLowerCase());
          const start = Math.max(0, index - 100);
          const end = Math.min(content.length, index + query.length + 100);
          const context = content.substring(start, end);
          
          searchResults.push({
            file: file,
            context: context,
            matchIndex: index
          });
        }
      } catch (error) {
        console.log(`Error buscando en archivo ${file.fileName}:`, error.message);
      }
    }

    res.json({
      success: true,
      query: query,
      results: searchResults,
      totalMatches: searchResults.length
    });

  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Obtener todo el contenido de la base de conocimiento (para el chatbot)
router.get('/content', optionalAuth, async (req, res) => {
  try {
    const result = await s3Service.getKnowledgeBaseContent(req.user.userId);
    res.json(result);

  } catch (error) {
    console.error('Error obteniendo contenido completo:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Sincronizar Knowledge Base manualmente
router.post('/sync', async (req, res) => {
  try {
    console.log('🔄 Sync manual solicitado...');
    const result = await syncService.syncKnowledgeBase('Sync manual desde interfaz');
    
    res.json({
      success: result.success,
      message: result.success ? 'Sync iniciado exitosamente' : 'Error iniciando sync',
      jobId: result.jobId,
      status: result.status,
      error: result.error
    });

  } catch (error) {
    console.error('Error en sync manual:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      message: 'No se pudo iniciar el sync'
    });
  }
});

module.exports = router;
