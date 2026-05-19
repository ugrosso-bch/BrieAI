const express = require('express');
const router = express.Router();
const databaseService = require('../services/databaseService');
const dynamoService = require('../services/dynamoService');
const notificationService = require('../services/notificationService');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Helper: obtener userId del request (con fallback para guest)
function getUserId(req) {
  return req.user?.userId || req.user?.username || 'guest';
}

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
    next();
  } catch (error) {
    next(); // Continuar aunque falle la auth
  }
};

// Obtener todas las conexiones
router.get('/connections', optionalAuth, async (req, res) => {
  try {
    // Obtener TODAS las conexiones desde DynamoDB (scan)
    const result = await dynamoService.getDbConnections(getUserId(req));
    
    if (result.success) {
      // Sincronizar con el servicio de base de datos en memoria
      // Usar 'id' como clave (consistente con cómo se guarda)
      result.connections.forEach(conn => {
        const connId = conn.id || conn.connectionId;
        if (connId && !databaseService.getConnection(connId)) {
          databaseService.saveConnection(connId, {
            ...conn,
            id: connId
          });
        }
      });
      
      res.json({
        success: true,
        connections: result.connections.map(conn => ({
          id: conn.id || conn.connectionId,
          name: conn.name,
          type: conn.type,
          host: conn.host,
          port: conn.port,
          database: conn.database,
          username: conn.username,
          description: conn.description || '',
          status: 'disconnected',
          createdAt: conn.createdAt,
          lastTested: null
        }))
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error obteniendo conexiones'
      });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener una conexión específica
router.get('/connections/:id', optionalAuth, (req, res) => {
  try {
    const connection = databaseService.getConnection(req.params.id);
    
    if (!connection) {
      return res.status(404).json({ 
        success: false, 
        error: 'Conexión no encontrada' 
      });
    }

    // No devolver la contraseña
    const { password, ...safeConnection } = connection;
    
    res.json({
      success: true,
      connection: safeConnection
    });
  } catch (error) {
    console.error('Error obteniendo conexión:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Probar conexión a base de datos
router.post('/test-connection', async (req, res) => {
  try {
    const { type, host, port, username, password, database, uri } = req.body;

    if (!type || !host) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tipo y host son requeridos' 
      });
    }

    const config = {
      type,
      host,
      port: parseInt(port) || (type === 'mysql' ? 3306 : type === 'postgresql' ? 5432 : 27017),
      username,
      password,
      database,
      uri
    };

    const result = await databaseService.testConnection(config);
    res.json(result);

  } catch (error) {
    console.error('Error probando conexión:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Crear nueva conexión
router.post('/connections', optionalAuth, async (req, res) => {
  try {
    const { name, type, host, port, username, password, database, uri, description } = req.body;

    if (!name || !type || !host) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nombre, tipo y host son requeridos' 
      });
    }

    const connectionId = uuidv4();
    const config = {
      name,
      type,
      host,
      port: parseInt(port) || (type === 'mysql' ? 3306 : type === 'postgresql' ? 5432 : 27017),
      username,
      password,
      database,
      uri,
      description: description || ''
    };

    const result = await databaseService.saveConnection(connectionId, config);
    
    if (result.success) {
      const userId = getUserId(req);
      
      // Guardar en DynamoDB con 'id' como clave (consistente con Lambda)
      const dbItem = {
        id: connectionId,         // Partition key para la Lambda
        connectionId,             // Alias para retrocompatibilidad
        name: config.name,
        type: config.type,
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username,
        password: config.password, // Se guardará también para que la Lambda pueda usarlo
        description: config.description,
        uri: config.uri || ''
      };
      
      try {
        const AWS = require('aws-sdk');
        const secretsManager = new AWS.SecretsManager({ region: 'us-east-1' });
        
        const secretName = `brieai-db-${connectionId}`;
        const secretData = {
          user: config.username,
          password: config.password,
          host: config.host,
          port: config.port.toString(),
          database: config.database
        };
        
        if (config.uri) secretData.uri = config.uri;
        
        const secretResult = await secretsManager.createSecret({
          Name: secretName,
          Description: `Credenciales para ${config.name}`,
          SecretString: JSON.stringify(secretData)
        }).promise();
        
        dbItem.secretArn = secretResult.ARN;
        console.log('Secret creado:', secretResult.ARN);
      } catch (secretError) {
        console.error('Error creando secret (guardando credenciales en DynamoDB):', secretError.message);
      }
      
      await dynamoService.saveDbConnection(userId, dbItem);

      // Enviar notificación
      await notificationService.notifyDatabaseConnectionAdded(config.name, config.type);
      
      const { password: _pwd, ...safeConnection } = result.connection;
      res.status(201).json({
        success: true,
        message: 'Conexión creada exitosamente',
        connection: { ...safeConnection, id: connectionId }
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Error creando conexión:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Actualizar conexión existente
router.put('/connections/:id', optionalAuth, async (req, res) => {
  try {
    const connectionId = req.params.id;
    const { name, type, host, port, username, password, database, uri, description } = req.body;

    const existingConnection = databaseService.getConnection(connectionId);
    if (!existingConnection) {
      return res.status(404).json({ 
        success: false, 
        error: 'Conexión no encontrada' 
      });
    }

    const config = {
      name: name || existingConnection.name,
      type: type || existingConnection.type,
      host: host || existingConnection.host,
      port: parseInt(port) || existingConnection.port,
      username: username || existingConnection.username,
      password: password || existingConnection.password,
      database: database || existingConnection.database,
      uri: uri || existingConnection.uri,
      description: description !== undefined ? description : existingConnection.description
    };

    const result = await databaseService.saveConnection(connectionId, config);
    
    if (result.success) {
      const { password, ...safeConnection } = result.connection;
      res.json({
        success: true,
        message: 'Conexión actualizada exitosamente',
        connection: safeConnection
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Error actualizando conexión:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Eliminar conexión
router.delete('/connections/:id', optionalAuth, async (req, res) => {
  try {
    const connectionId = req.params.id;
    const connection = databaseService.getConnection(connectionId);
    const result = databaseService.deleteConnection(connectionId);
    
    // Eliminar de DynamoDB (intentar con ambas claves)
    const userId = getUserId(req);
    try {
      await dynamoService.deleteDbConnection(userId, connectionId);
    } catch (e) {
      console.error('Error eliminando de DynamoDB:', e.message);
    }
    
    if (result.success) {
      // Enviar notificación si teníamos la conexión
      if (connection) {
        await notificationService.notifyDatabaseConnectionRemoved(connection.name, connection.type);
      }
      
      res.json({
        success: true,
        message: 'Conexión eliminada exitosamente'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Conexión no encontrada'
      });
    }

  } catch (error) {
    console.error('Error eliminando conexión:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Ejecutar consulta
router.post('/connections/:id/query', optionalAuth, async (req, res) => {
  try {
    const { query } = req.body;
    const connectionId = req.params.id;

    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Consulta requerida' 
      });
    }

    // Asegurar que la conexión esté en memoria
    if (!databaseService.getConnection(connectionId)) {
      const dynResult = await dynamoService.getDbConnections(getUserId(req));
      if (dynResult.success) {
        dynResult.connections.forEach(conn => {
          const id = conn.id || conn.connectionId;
          if (id) databaseService.saveConnection(id, { ...conn, id });
        });
      }
    }

    const result = await databaseService.executeQuery(connectionId, query);
    res.json(result);

  } catch (error) {
    console.error('Error ejecutando consulta:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Obtener esquema de la base de datos
router.get('/connections/:id/schema', optionalAuth, async (req, res) => {
  try {
    const connectionId = req.params.id;

    // Asegurar que la conexión esté en memoria
    if (!databaseService.getConnection(connectionId)) {
      const dynResult = await dynamoService.getDbConnections(getUserId(req));
      if (dynResult.success) {
        dynResult.connections.forEach(conn => {
          const id = conn.id || conn.connectionId;
          if (id) databaseService.saveConnection(id, { ...conn, id });
        });
      }
    }

    const result = await databaseService.getSchema(connectionId);
    res.json(result);

  } catch (error) {
    console.error('Error obteniendo esquema:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Probar conexión existente
router.post('/connections/:id/test', optionalAuth, async (req, res) => {
  try {
    const connectionId = req.params.id;

    // Asegurar que la conexión esté en memoria
    if (!databaseService.getConnection(connectionId)) {
      const dynResult = await dynamoService.getDbConnections(getUserId(req));
      if (dynResult.success) {
        dynResult.connections.forEach(conn => {
          const id = conn.id || conn.connectionId;
          if (id) databaseService.saveConnection(id, { ...conn, id });
        });
      }
    }

    const connection = databaseService.getConnection(connectionId);
    
    if (!connection) {
      return res.status(404).json({ 
        success: false, 
        error: 'Conexión no encontrada' 
      });
    }

    const result = await databaseService.testConnection(connection);
    res.json(result);

  } catch (error) {
    console.error('Error probando conexión:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

module.exports = router;
