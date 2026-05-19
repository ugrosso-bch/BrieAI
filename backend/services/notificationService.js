const { SNSClient, CreateTopicCommand, SubscribeCommand, PublishCommand, ListSubscriptionsByTopicCommand, UnsubscribeCommand } = require('@aws-sdk/client-sns');
require('dotenv').config();

class NotificationService {
  constructor() {
    this.snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.topicArn = null;
    this.initializeTopic();
  }

  async initializeTopic() {
    try {
      // Usar el ARN del topic existente desde las variables de entorno
      this.topicArn = process.env.SNS_TOPIC_NAME;
      
      // Si no es un ARN, crear el topic
      if (!this.topicArn || !this.topicArn.startsWith('arn:aws:sns:')) {
        const createTopicCommand = new CreateTopicCommand({
          Name: process.env.SNS_TOPIC_NAME || 'brieai-notifications-dev'
        });
        const response = await this.snsClient.send(createTopicCommand);
        this.topicArn = response.TopicArn;
      }
      
      console.log('SNS Topic initialized:', this.topicArn);
    } catch (error) {
      console.error('Error initializing SNS topic:', error);
    }
  }

  async subscribeEmail(email) {
    try {
      if (!this.topicArn) await this.initializeTopic();
      
      const subscribeCommand = new SubscribeCommand({
        TopicArn: this.topicArn,
        Protocol: 'email',
        Endpoint: email
      });
      
      const response = await this.snsClient.send(subscribeCommand);
      return { success: true, subscriptionArn: response.SubscriptionArn };
    } catch (error) {
      console.error('Error subscribing email:', error);
      return { success: false, error: error.message };
    }
  }

  async unsubscribeEmail(subscriptionArn) {
    try {
      // Verificar si es una suscripción pendiente
      if (subscriptionArn === 'PendingConfirmation' || !subscriptionArn.includes('arn:aws:sns')) {
        return { success: false, error: 'No se puede eliminar una suscripción pendiente de confirmación. Confirma el email primero.' };
      }
      
      const unsubscribeCommand = new UnsubscribeCommand({
        SubscriptionArn: subscriptionArn
      });
      
      await this.snsClient.send(unsubscribeCommand);
      return { success: true };
    } catch (error) {
      console.error('Error unsubscribing email:', error);
      return { success: false, error: error.message };
    }
  }

  async getSubscriptions() {
    try {
      if (!this.topicArn) await this.initializeTopic();
      
      const listCommand = new ListSubscriptionsByTopicCommand({
        TopicArn: this.topicArn
      });
      
      const response = await this.snsClient.send(listCommand);
      return response.Subscriptions || [];
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      return [];
    }
  }

  async sendNotification(subject, message) {
    try {
      if (!this.topicArn) await this.initializeTopic();
      
      const publishCommand = new PublishCommand({
        TopicArn: this.topicArn,
        Subject: subject,
        Message: message
      });
      
      await this.snsClient.send(publishCommand);
      console.log('Notification sent:', subject);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Métodos específicos para eventos
  async notifyDatabaseConnectionAdded(connectionName, dbType) {
    const subject = 'Nueva Conexión de Base de Datos - BrieAI';
    const message = `Se ha agregado una nueva conexión de base de datos:
    
Nombre: ${connectionName}
Tipo: ${dbType}
Fecha: ${new Date().toLocaleString('es-ES')}

Esta conexión ya está disponible para usar en el chat.`;
    
    await this.sendNotification(subject, message);
  }

  async notifyDatabaseConnectionRemoved(connectionName, dbType) {
    const subject = 'Conexión de Base de Datos Eliminada - BrieAI';
    const message = `Se ha eliminado una conexión de base de datos:
    
Nombre: ${connectionName}
Tipo: ${dbType}
Fecha: ${new Date().toLocaleString('es-ES')}`;
    
    await this.sendNotification(subject, message);
  }

  async notifyKnowledgeBaseFileAdded(fileName, fileSize) {
    const subject = 'Nuevo Archivo en Base de Conocimiento - BrieAI';
    const message = `Se ha agregado un nuevo archivo a la base de conocimiento:
    
Archivo: ${fileName}
Tamaño: ${(fileSize / 1024).toFixed(2)} KB
Fecha: ${new Date().toLocaleString('es-ES')}

El archivo ya está disponible para consultas en el chat.`;
    
    await this.sendNotification(subject, message);
  }

  async notifyKnowledgeBaseFileRemoved(fileName) {
    const subject = 'Archivo Eliminado de Base de Conocimiento - BrieAI';
    const message = `Se ha eliminado un archivo de la base de conocimiento:
    
Archivo: ${fileName}
Fecha: ${new Date().toLocaleString('es-ES')}`;
    
    await this.sendNotification(subject, message);
  }
}

module.exports = new NotificationService();