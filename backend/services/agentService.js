const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require('@aws-sdk/client-bedrock-agent-runtime');

class AgentService {
  constructor() {
    this.client = new BedrockAgentRuntimeClient({ 
      region: process.env.AWS_REGION || 'us-east-1' 
    });
    this.agentId = process.env.BEDROCK_AGENT_ID;
    this.agentAliasId = process.env.BEDROCK_AGENT_ALIAS_ID;
  }

  async invokeAgent(message, sessionId = null) {
    try {
      console.log('🤖 Invocando Bedrock Agent:', { 
        agentId: this.agentId, 
        aliasId: this.agentAliasId,
        messageLength: message.length,
        sessionId 
      });
      
      if (!this.agentId) {
        throw new Error('BEDROCK_AGENT_ID no está configurado en las variables de entorno');
      }

      const finalSessionId = sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const command = new InvokeAgentCommand({
        agentId: this.agentId,
        agentAliasId: this.agentAliasId,
        sessionId: finalSessionId,
        inputText: message
      });

      console.log('📤 Enviando comando al Agent...');
      const response = await this.client.send(command);
      console.log('📥 Respuesta recibida del Agent');
      
      // Procesar el stream de respuesta
      let fullResponse = '';
      let chunkCount = 0;
      
      if (response.completion) {
        for await (const chunk of response.completion) {
          chunkCount++;
          if (chunk.chunk && chunk.chunk.bytes) {
            const text = new TextDecoder().decode(chunk.chunk.bytes);
            fullResponse += text;
          }
        }
      }

      console.log(`✅ Respuesta procesada: ${chunkCount} chunks, ${fullResponse.length} caracteres`);
      
      if (!fullResponse.trim()) {
        console.warn('⚠️ Respuesta vacía del Agent');
        return {
          success: true,
          response: 'El Agent procesó tu consulta pero no generó una respuesta. Intenta reformular tu pregunta.',
          sessionId: finalSessionId
        };
      }
      
      return {
        success: true,
        response: fullResponse,
        sessionId: finalSessionId
      };

    } catch (error) {
      console.error('❌ Error invocando Agent:', error.message);
      console.error('Error completo:', JSON.stringify(error, null, 2));
      console.error('Stack trace:', error.stack);
      
      let errorMessage = 'Error desconocido del Agent';
      let userFriendlyMessage = 'Hubo un problema con el Agent. Intenta usar el modo básico.';
      
      if (error.name === 'ResourceNotFoundException') {
        errorMessage = 'Agent o Alias BRIEAI no encontrado';
        userFriendlyMessage = 'El Agent BRIEAI no está disponible. Verifica que esté desplegado correctamente.';
      } else if (error.name === 'ValidationException') {
        errorMessage = 'Parámetros inválidos';
        userFriendlyMessage = 'Error de configuración del Agent. Verifica los parámetros.';
      } else if (error.name === 'AccessDeniedException') {
        errorMessage = 'Sin permisos para acceder al Agent';
        userFriendlyMessage = 'Sin permisos para usar el Agent. Verifica la configuración de IAM.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Timeout del Agent';
        userFriendlyMessage = 'El Agent tardó demasiado en responder. Intenta de nuevo.';
      } else {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        response: userFriendlyMessage
      };
    }
  }

  // Método para verificar el estado del Agent
  async checkAgentStatus() {
    try {
      if (!this.agentId) {
        return { available: false, error: 'Agent ID no configurado' };
      }
      
      // Intentar una consulta simple para verificar disponibilidad
      const testResult = await this.invokeAgent('Hola', `test-${Date.now()}`);
      return { 
        available: testResult.success, 
        error: testResult.success ? null : testResult.error 
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }
}

module.exports = new AgentService();