const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

class DynamoService {
  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this.docClient = DynamoDBDocumentClient.from(client);
    
    this.tables = {
      conversations: process.env.DYNAMODB_CONVERSATIONS_TABLE || 'brieai-conversations',
      dbConnections: process.env.DYNAMODB_DB_CONNECTIONS_TABLE || 'brieai-db-connections',
      documents: process.env.DYNAMODB_DOCUMENTS_TABLE || 'brieai-documents'
    };
  }

  // Conversaciones
  async saveConversation(userId, messages, title = null) {
    try {
      const conversationId = uuidv4();
      const timestamp = Date.now();
      
      const command = new PutCommand({
        TableName: this.tables.conversations,
        Item: {
          userId,
          conversationId,
          title: title || `Conversación ${new Date().toLocaleDateString()}`,
          messages,
          timestamp,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      await this.docClient.send(command);
      return { success: true, conversationId };
    } catch (error) {
      console.error('Error guardando conversación:', error);
      return { success: false, error: error.message };
    }
  }

  async getConversations(userId) {
    try {
      const command = new QueryCommand({
        TableName: this.tables.conversations,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        },
        ScanIndexForward: false // Ordenar por timestamp descendente
      });

      const response = await this.docClient.send(command);
      return { success: true, conversations: response.Items || [] };
    } catch (error) {
      console.error('Error obteniendo conversaciones:', error);
      return { success: false, error: error.message };
    }
  }

  async getConversation(userId, conversationId) {
    try {
      const command = new GetCommand({
        TableName: this.tables.conversations,
        Key: { userId, conversationId }
      });

      const response = await this.docClient.send(command);
      return { success: true, conversation: response.Item };
    } catch (error) {
      console.error('Error obteniendo conversación:', error);
      return { success: false, error: error.message };
    }
  }

  async updateConversation(userId, conversationId, messages, title = null) {
    try {
      const updateExpression = title 
        ? 'SET messages = :messages, title = :title, updatedAt = :updatedAt'
        : 'SET messages = :messages, updatedAt = :updatedAt';
      
      const expressionAttributeValues = {
        ':messages': messages,
        ':updatedAt': new Date().toISOString()
      };
      
      if (title) {
        expressionAttributeValues[':title'] = title;
      }

      const command = new UpdateCommand({
        TableName: this.tables.conversations,
        Key: { userId, conversationId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues
      });

      await this.docClient.send(command);
      return { success: true };
    } catch (error) {
      console.error('Error actualizando conversación:', error);
      return { success: false, error: error.message };
    }
  }

  async saveMessage(userId, conversationId, message) {
    try {
      // Obtener conversación existente
      const existingConv = await this.getConversation(userId, conversationId);
      
      let messages = [];
      if (existingConv.success && existingConv.conversation) {
        messages = existingConv.conversation.messages || [];
      }
      
      // Agregar nuevo mensaje
      messages.push(message);
      
      // Si la conversación no existe, crearla
      if (!existingConv.success || !existingConv.conversation) {
        return await this.saveConversation(userId, messages);
      }
      
      // Actualizar conversación existente
      return await this.updateConversation(userId, conversationId, messages);
    } catch (error) {
      console.error('Error guardando mensaje:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteConversation(userId, conversationId) {
    try {
      const command = new DeleteCommand({
        TableName: this.tables.conversations,
        Key: { userId, conversationId }
      });

      await this.docClient.send(command);
      return { success: true };
    } catch (error) {
      console.error('Error eliminando conversación:', error);
      return { success: false, error: error.message };
    }
  }

  // Conexiones de Base de Datos
  async saveDbConnection(userId, connectionData) {
    try {
      // La tabla usa userId (HASH) + connectionId (RANGE)
      const connectionId = connectionData.id || connectionData.connectionId || uuidv4();
      
      const command = new PutCommand({
        TableName: this.tables.dbConnections,
        Item: {
          userId: userId || 'guest',   // HASH key
          connectionId,                 // RANGE key
          id: connectionId,             // Alias para compatibilidad con la Lambda
          ...connectionData,
          createdAt: connectionData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      await this.docClient.send(command);
      return { success: true, connectionId };
    } catch (error) {
      console.error('Error guardando conexión DB:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteDbConnection(userId, connectionId) {
    try {
      // Intentar eliminar usando 'id' como partition key
      const command = new DeleteCommand({
        TableName: this.tables.dbConnections,
        Key: { id: connectionId }
      });

      await this.docClient.send(command);
      return { success: true };
    } catch (error) {
      console.error('Error eliminando conexión DB:', error);
      return { success: false, error: error.message };
    }
  }

  async getDbConnections(userId) {
    try {
      const command = new ScanCommand({
        TableName: this.tables.dbConnections
      });

      const response = await this.docClient.send(command);
      return { success: true, connections: response.Items || [] };
    } catch (error) {
      console.error('Error obteniendo conexiones DB:', error);
      return { success: false, error: error.message };
    }
  }

  async getDbConnection(userId, connectionId) {
    try {
      const command = new GetCommand({
        TableName: this.tables.dbConnections,
        Key: { userId, connectionId }
      });

      const response = await this.docClient.send(command);
      return { success: true, connection: response.Item };
    } catch (error) {
      console.error('Error obteniendo conexión DB:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteDbConnection(userId, connectionId) {
    try {
      // Primero intentar con el userId que tenemos
      const knownUserIds = [userId, 'guest'];
      
      for (const uid of knownUserIds) {
        if (!uid) continue;
        try {
          const command = new DeleteCommand({
            TableName: this.tables.dbConnections,
            Key: { userId: uid, connectionId }
          });
          await this.docClient.send(command);
        } catch (e) {
          // ignorar errores individuales
        }
      }
      
      // Si no encontramos con userId conocido, hacer scan y eliminar
      const scanResult = await this.docClient.send(new ScanCommand({
        TableName: this.tables.dbConnections,
        FilterExpression: 'connectionId = :cid OR id = :cid',
        ExpressionAttributeValues: { ':cid': connectionId }
      }));
      
      for (const item of (scanResult.Items || [])) {
        await this.docClient.send(new DeleteCommand({
          TableName: this.tables.dbConnections,
          Key: { userId: item.userId, connectionId: item.connectionId }
        }));
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error eliminando conexión DB:', error);
      return { success: false, error: error.message };
    }
  }

  // Documentos
  async saveDocument(userId, documentData) {
    try {
      const documentId = uuidv4();
      const uploadDate = Date.now();
      
      const command = new PutCommand({
        TableName: this.tables.documents,
        Item: {
          userId,
          documentId,
          uploadDate,
          ...documentData,
          createdAt: new Date().toISOString()
        }
      });

      await this.docClient.send(command);
      return { success: true, documentId };
    } catch (error) {
      console.error('Error guardando documento:', error);
      return { success: false, error: error.message };
    }
  }

  async getDocuments(userId) {
    try {
      const command = new QueryCommand({
        TableName: this.tables.documents,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        },
        ScanIndexForward: false // Ordenar por fecha de subida descendente
      });

      const response = await this.docClient.send(command);
      return { success: true, documents: response.Items || [] };
    } catch (error) {
      console.error('Error obteniendo documentos:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteDocument(userId, documentId) {
    try {
      const command = new DeleteCommand({
        TableName: this.tables.documents,
        Key: { userId, documentId }
      });

      await this.docClient.send(command);
      return { success: true };
    } catch (error) {
      console.error('Error eliminando documento:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new DynamoService();