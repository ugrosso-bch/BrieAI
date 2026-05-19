const express = require('express');
const router = express.Router();
const bedrockService = require('../services/bedrockService');
const databaseService = require('../services/databaseService');
const s3Service = require('../services/s3Service');
const dynamoService = require('../services/dynamoService');
const { authenticateToken } = require('../middleware/auth');

// Almacenamiento temporal en memoria para conversaciones
const conversationMemory = new Map();

// Enviar mensaje al chatbot
router.post('/message', async (req, res) => {
  try {
    const { message, connectionId, conversationId } = req.body;
    console.log('📨 CHAT REQUEST:', { message: message.substring(0, 50), connectionId, conversationId });

    if (!message) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }

    // Si hay connectionId, actuar como agente text-to-SQL
    if (connectionId) {
      const connection = databaseService.getConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ 
          success: false, 
          error: 'Conexión no encontrada' 
        });
      }

      try {
        // Obtener esquema de la base de datos
        const schemaResult = await databaseService.getSchema(connectionId);
        if (!schemaResult.success) {
          return res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo esquema de la base de datos' 
          });
        }

        // Generar consulta SQL usando Claude
        const sqlPrompt = `Basado en este esquema de base de datos, genera SOLO la consulta SQL para: "${message}"

Esquema:
${JSON.stringify(schemaResult.schema, null, 2)}

Responde SOLO con la consulta SQL, sin explicaciones:`;
        
        const sqlResponse = await bedrockService.sendDirectMessage(sqlPrompt);
        
        if (!sqlResponse.success) {
          return res.status(500).json({
            success: false,
            error: 'Error generando consulta SQL'
          });
        }

        // Limpiar y extraer SQL
        let sqlQuery = sqlResponse.message.trim();
        sqlQuery = sqlQuery.replace(/```sql/g, '').replace(/```/g, '').replace(/sql/g, '').trim();
        
        // Ejecutar la consulta
        const queryResult = await databaseService.executeQuery(connectionId, sqlQuery);
        
        if (queryResult.success && queryResult.data) {
          // Usar Claude para interpretar los resultados
          const interpretPrompt = `Interpreta estos resultados de SQL y responde de forma natural:

Pregunta: "${message}"
Consulta: ${sqlQuery}
Resultados: ${JSON.stringify(queryResult.data, null, 2)}

Respuesta natural:`;

          const interpretResponse = await bedrockService.sendDirectMessage(interpretPrompt);
          
          return res.json({
            success: true,
            message: interpretResponse.success ? interpretResponse.message : `Consulta ejecutada. Resultados: ${JSON.stringify(queryResult.data)}`,
            sqlQuery: sqlQuery,
            contextUsed: {
              database: true,
              knowledgeBase: 0,
              queryResults: true
            }
          });
        } else {
          return res.status(500).json({
            success: false,
            error: 'Error ejecutando consulta SQL',
            message: queryResult.error || 'No se pudieron obtener los datos'
          });
        }

      } catch (error) {
        console.error('Error en text-to-SQL:', error);
        return res.status(500).json({
          success: false,
          error: 'Error procesando consulta',
          message: error.message
        });
      }
    }

    // Si no hay connectionId, usar Claude con base de conocimiento
    let conversationHistory = '';
    
    // Obtener historial si hay conversationId (usando memoria temporal)
    if (conversationId) {
      console.log('🔍 Obteniendo historial para conversationId:', conversationId);
      const conversationKey = `guest_${conversationId}`;
      const messages = conversationMemory.get(conversationKey) || [];
      console.log('💬 Mensajes en memoria:', messages.length);
      
      if (messages.length > 0) {
        conversationHistory = messages.slice(-20).map(msg => 
          `${msg.role === 'user' ? 'Usuario' : 'BrieAI'}: ${msg.content}`
        ).join('\n\n');
        console.log('📝 Contexto construido:', conversationHistory.substring(0, 200) + '...');
      }
    } else {
      console.log('⚠️ No hay conversationId proporcionado');
    }
    
    const response = await bedrockService.sendMessage(message, conversationHistory);

    if (response.success) {
      // Guardar mensaje en memoria temporal
      if (conversationId) {
        const conversationKey = `guest_${conversationId}`;
        const messages = conversationMemory.get(conversationKey) || [];
        
        messages.push({
          role: 'user',
          content: message,
          timestamp: new Date().toISOString()
        });
        
        messages.push({
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString()
        });
        
        conversationMemory.set(conversationKey, messages);
        console.log('💾 Mensajes guardados en memoria:', messages.length);
      }
      
      res.json({
        success: true,
        message: response.message,
        usage: response.usage,
        citations: response.citations || [],
        contextUsed: {
          database: false,
          knowledgeBase: response.contextUsed?.knowledgeBase || 0,
          queryResults: false
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: response.error,
        message: response.message
      });
    }

  } catch (error) {
    console.error('Error en chat:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      message: 'Hubo un problema al procesar tu mensaje'
    });
  }
});

// Analizar datos con Claude
router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    const { query, connectionId } = req.body;

    if (!query || !connectionId) {
      return res.status(400).json({ error: 'Query y connectionId requeridos' });
    }

    const connection = databaseService.getConnection(connectionId);
    if (!connection) {
      return res.status(404).json({ error: 'Conexión no encontrada' });
    }

    // Obtener esquema de la base de datos
    const schemaResult = await databaseService.getSchema(connectionId);
    if (!schemaResult.success) {
      return res.status(500).json({ error: 'Error obteniendo esquema de la base de datos' });
    }

    // Ejecutar consulta para obtener datos de muestra
    let sampleData = '';
    try {
      const queryResult = await databaseService.executeQuery(connectionId, query);
      if (queryResult.success) {
        sampleData = JSON.stringify(queryResult.data.slice(0, 5), null, 2); // Primeros 5 registros
      }
    } catch (error) {
      // Si la consulta falla, continuamos sin datos de muestra
      console.log('No se pudieron obtener datos de muestra:', error.message);
    }

    // Analizar con Claude
    const analysisResult = await bedrockService.analyzeData(
      query,
      JSON.stringify(schemaResult.schema, null, 2),
      sampleData
    );

    if (analysisResult.success) {
      res.json({
        success: true,
        analysis: analysisResult.message,
        schema: schemaResult.schema,
        sampleData: sampleData ? JSON.parse(sampleData) : null
      });
    } else {
      res.status(500).json({
        success: false,
        error: analysisResult.error
      });
    }

  } catch (error) {
    console.error('Error en análisis:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener historial de conversación
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const result = await dynamoService.getConversations(req.user.userId);
    
    if (result.success) {
      res.json({
        success: true,
        conversations: result.conversations
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error obteniendo historial'
      });
    }
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;
