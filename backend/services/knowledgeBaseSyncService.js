const { BedrockAgentClient, StartIngestionJobCommand } = require('@aws-sdk/client-bedrock-agent');

class KnowledgeBaseSyncService {
  constructor() {
    const config = {
      region: process.env.AWS_REGION || 'us-east-1'
    };

    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      };
    }

    this.client = new BedrockAgentClient(config);
    this.knowledgeBaseId = process.env.BEDROCK_KNOWLEDGE_BASE_ID;
    this.dataSourceId = process.env.BEDROCK_DATA_SOURCE_ID;
  }

  async syncKnowledgeBase(reason = 'Manual sync') {
    try {
      if (!this.knowledgeBaseId) {
        console.log('⚠️  Knowledge Base ID no configurado, saltando sync');
        return { success: false, error: 'Knowledge Base ID no configurado' };
      }

      console.log('🔄 Iniciando sync del Knowledge Base...');
      console.log('   - KB ID:', this.knowledgeBaseId);
      console.log('   - Data Source ID:', this.dataSourceId);
      console.log('   - Razón:', reason);

      const command = new StartIngestionJobCommand({
        knowledgeBaseId: this.knowledgeBaseId,
        dataSourceId: this.dataSourceId,
        description: `${reason} - ${new Date().toISOString()}`
      });

      const response = await this.client.send(command);
      const jobId = response.ingestionJob.ingestionJobId;

      console.log('✅ Sync iniciado exitosamente:', jobId);

      return {
        success: true,
        jobId: jobId,
        status: response.ingestionJob.status,
        message: 'Sync iniciado exitosamente'
      };

    } catch (error) {
      console.error('❌ Error iniciando sync:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async syncAfterUpload(fileName) {
    return await this.syncKnowledgeBase(`Archivo subido: ${fileName}`);
  }

  async syncAfterDelete(fileName) {
    return await this.syncKnowledgeBase(`Archivo eliminado: ${fileName}`);
  }
}

module.exports = new KnowledgeBaseSyncService();
