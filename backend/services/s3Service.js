const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

class S3Service {
  constructor() {
    // Configuración para usar el perfil default local
    const config = {
      region: process.env.AWS_REGION || 'us-east-1'
    };

    // Solo agregar credenciales explícitas si están definidas
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      };
    }
    // Si no hay credenciales explícitas, el SDK usará el perfil default automáticamente

    this.client = new S3Client(config);
    this.bucketName = process.env.S3_BUCKET_NAME || 'demo-bigcheese-sharktank';
  }

  async uploadFile(file, fileName, userId, metadata = {}) {
    try {
      const key = `knowledge-base/${userId}/${uuidv4()}-${fileName}`;
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: fileName,
          uploadDate: new Date().toISOString(),
          ...metadata
        }
      });

      await this.client.send(command);

      return {
        success: true,
        key: key,
        fileName: fileName,
        size: file.size,
        contentType: file.mimetype
      };

    } catch (error) {
      console.error('Error subiendo archivo a S3:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getFile(key, userId = null) {
    try {
      // Si no tiene el prefijo del usuario, agregarlo
      const fullKey = userId && !key.startsWith(`knowledge-base/${userId}/`) ? 
        `knowledge-base/${userId}/${key}` : key;
      
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fullKey
      });

      const response = await this.client.send(command);
      
      // Convertir stream a buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      return {
        success: true,
        content: buffer.toString('utf-8'),
        metadata: response.Metadata,
        contentType: response.ContentType
      };

    } catch (error) {
      console.error('Error obteniendo archivo de S3:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async listFiles(userId = null) {
    try {
      const prefix = userId ? `knowledge-base/${userId}/` : 'knowledge-base/';
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix
      });

      const response = await this.client.send(command);

      const files = response.Contents?.map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        fileName: obj.Key.split('/').pop()
      })) || [];

      return {
        success: true,
        files: files
      };

    } catch (error) {
      console.error('Error listando archivos de S3:', error);
      return {
        success: false,
        error: error.message,
        files: []
      };
    }
  }

  async deleteFile(key, userId = null) {
    try {
      // Si no tiene el prefijo del usuario, agregarlo
      const fullKey = userId && !key.startsWith(`knowledge-base/${userId}/`) ? 
        `knowledge-base/${userId}/${key}` : key;
      
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fullKey
      });

      await this.client.send(command);

      return {
        success: true,
        message: 'Archivo eliminado correctamente'
      };

    } catch (error) {
      console.error('Error eliminando archivo de S3:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getKnowledgeBaseContent(userId = null) {
    try {
      const filesList = await this.listFiles(userId);
      
      if (!filesList.success) {
        return { success: false, content: '' };
      }

      let combinedContent = '';

      for (const file of filesList.files) {
        const fileContent = await this.getFile(file.key);
        if (fileContent.success) {
          combinedContent += `\n\n--- Archivo: ${file.fileName} ---\n`;
          combinedContent += fileContent.content;
        }
      }

      return {
        success: true,
        content: combinedContent,
        fileCount: filesList.files.length
      };

    } catch (error) {
      console.error('Error obteniendo contenido de base de conocimiento:', error);
      return {
        success: false,
        content: '',
        error: error.message
      };
    }
  }
}

module.exports = new S3Service();
