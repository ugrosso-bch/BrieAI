const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand, InvokeAgentCommand } = require('@aws-sdk/client-bedrock-agent-runtime');

class BedrockService {
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

    this.client = new BedrockRuntimeClient(config);
    this.agentClient = new BedrockAgentRuntimeClient(config);
    this.modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0';
    this.knowledgeBaseId = process.env.BEDROCK_KNOWLEDGE_BASE_ID || 'GGWEF8GFTP';
    this.agentId = process.env.BEDROCK_AGENT_ID;
    this.agentAliasId = process.env.BEDROCK_AGENT_ALIAS_ID || 'TSTALIASID';
    
    // Debug logs
    console.log('🤖 BrieAI Agent inicializado:');
    console.log('   - Agent ID:', this.agentId);
    console.log('   - Alias ID:', this.agentAliasId);
    console.log('   - Knowledge Base ID:', this.knowledgeBaseId);
    console.log('   - Region:', config.region);
    console.log('   - Modo: Solo Agent (sin fallbacks)');
    console.log('');
  }

  async sendMessage(message, context = '') {
    try {
      // Usar SOLO Agent BrieAI
      console.log('🤖 Invocando Agent BrieAI...');
      return await this.sendMessageWithAgent(message, context);
    } catch (error) {
      console.error('❌ ERROR AGENT BrieAI:');
      console.error('   - Error name:', error.name);
      console.error('   - Error message:', error.message);
      console.error('   - Error code:', error.code);
      console.error('   - Full error:', error);
      
      return {
        success: false,
        error: error.message,
        message: `Agent BrieAI Error: ${error.message}`
      };
    }
  }

  async sendMessageWithAgent(message, context = '', sessionId = null) {
    try {
      console.log('🤖 Usando Agent BrieAI:', this.agentId);
      
      let enhancedMessage = message;
      if (context) {
        enhancedMessage = `Historial de conversación reciente:\n${context}\n\nMensaje actual: ${message}`;
      }
      
      const finalSessionId = sessionId || ('brieai-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9));
      
      const response = await this._invokeAgentWithReturnControl(enhancedMessage, finalSessionId, null);
      
      console.log('📥 Respuesta de BrieAI:', (response.message || '').substring(0, 200) + '...');
      
      return {
        success: true,
        message: response.message || '¡Hola! Soy BrieAI, tu asistente de análisis de datos. ¿En qué puedo ayudarte?',
        sessionId: finalSessionId,
        contextUsed: {
          agent: true,
          database: response.usedDatabase || false,
          email: response.sentEmail || false,
          knowledgeBase: 0
        }
      };
      
    } catch (error) {
      console.error('Error con Agent BrieAI:', error);
      throw error;
    }
  }

  /**
   * Invoca el agente y maneja el ciclo RETURNCONTROL:
   * el agente pide ejecutar una action group → el backend la ejecuta → devuelve el resultado → el agente responde
   */
  async _invokeAgentWithReturnControl(inputText, sessionId, returnControlResults, maxIterations = 5) {
    const databaseService = require('./databaseService');
    const dynamoService = require('./dynamoService');
    const sesService = require('./sesService');

    let usedDatabase = false;
    let sentEmail = false;
    let iteration = 0;

    let currentInput = inputText;
    let currentReturnControl = returnControlResults;

    while (iteration < maxIterations) {
      iteration++;
      console.log(`🔄 Agent iteration ${iteration}/${maxIterations}`);

      const commandParams = {
        agentId: this.agentId,
        agentAliasId: this.agentAliasId,
        sessionId,
        inputText: currentInput || ' ',
      };

      // Si hay resultados de returnControl de la iteración anterior, enviarlos
      if (currentReturnControl) {
        commandParams.sessionState = {
          invocationId: currentReturnControl.invocationId,
          returnControlInvocationResults: currentReturnControl.returnControlInvocationResults
        };
        commandParams.inputText = ' ';
      }

      const command = new InvokeAgentCommand(commandParams);
      const response = await this.agentClient.send(command);

      // Procesar stream
      let fullResponse = '';
      let returnControlInvocation = null;

      if (response.completion) {
        for await (const chunk of response.completion) {
          if (chunk.chunk && chunk.chunk.bytes) {
            const text = new TextDecoder().decode(chunk.chunk.bytes);
            fullResponse += text;
          }
          // Detectar returnControl (el agente quiere ejecutar una acción)
          if (chunk.returnControl) {
            returnControlInvocation = chunk.returnControl;
            console.log('🔧 Agent pidió RETURNCONTROL:', JSON.stringify(returnControlInvocation).substring(0, 200));
          }
        }
      }

      // Si el agente devolvió una respuesta de texto, terminamos
      if (fullResponse.trim()) {
        return { message: fullResponse, usedDatabase, sentEmail };
      }

      // Si el agente quiere ejecutar una acción, la ejecutamos
      if (returnControlInvocation) {
        const results = [];
        const invocationId = returnControlInvocation.invocationId;

        for (const invocationInput of (returnControlInvocation.invocationInputs || [])) {
          const apiInvocation = invocationInput.apiInvocationInput;
          const funcInvocation = invocationInput.functionInvocationInput;

          let actionResult;

          if (apiInvocation) {
            const { actionGroup, apiPath, httpMethod, parameters, requestBody } = apiInvocation;
            const params = {};
            (parameters || []).forEach(p => { params[p.name] = p.value; });
            if (requestBody?.content?.['application/json']?.properties) {
              Object.entries(requestBody.content['application/json'].properties).forEach(([k, v]) => {
                params[k] = v.value;
              });
            }

            console.log(`⚡ Ejecutando ${actionGroup}${apiPath} con params:`, params);

            if (actionGroup === 'DatabaseActions' || actionGroup?.includes('Database')) {
              actionResult = await this._executeDbAction(apiPath, params, databaseService, dynamoService);
              usedDatabase = true;
            } else if (actionGroup === 'EmailActions' || actionGroup?.includes('Email')) {
              actionResult = await this._executeEmailAction(apiPath, params, sesService);
              sentEmail = true;
            } else {
              actionResult = { statusCode: 400, body: { error: `Action group desconocido: ${actionGroup}` } };
            }

            // Formato correcto del SDK: InvocationResultMember con invocationId
            results.push({
              apiResult: {
                actionGroup,
                apiPath,
                httpMethod: httpMethod || 'POST',
                httpStatusCode: actionResult.statusCode || 200,
                responseBody: {
                  'application/json': {
                    body: JSON.stringify(actionResult.body || actionResult)
                  }
                }
              }
            });
          } else if (funcInvocation) {
            // function-based action group
            const { actionGroup, function: funcName, parameters: funcParams } = funcInvocation;
            const params = {};
            (funcParams || []).forEach(p => { params[p.name] = p.value; });
            
            console.log(`⚡ Function invocation ${actionGroup}.${funcName} con params:`, params);
            
            // Ejecutar como DB o Email según el action group
            if (actionGroup === 'DatabaseActions' || actionGroup?.includes('Database')) {
              actionResult = await this._executeDbAction(`/${funcName}`, params, databaseService, dynamoService);
              usedDatabase = true;
            } else if (actionGroup === 'EmailActions' || actionGroup?.includes('Email')) {
              actionResult = await this._executeEmailAction(`/${funcName}`, params, sesService);
              sentEmail = true;
            } else {
              actionResult = { statusCode: 400, body: { error: `Desconocido: ${actionGroup}` } };
            }

            results.push({
              functionResult: {
                actionGroup,
                function: funcName,
                responseBody: {
                  'TEXT': {
                    body: JSON.stringify(actionResult.body || actionResult)
                  }
                }
              }
            });
          }
        }

        // Siguiente iteración: enviar los resultados con el invocationId
        currentInput = '';
        currentReturnControl = {
          invocationId,
          returnControlInvocationResults: results
        };
        continue;
      }

      // Si no hay respuesta ni returnControl, algo salió mal
      console.warn('⚠️ Agent no devolvió respuesta ni returnControl en iteración', iteration);
      break;
    }

    return { message: 'No se pudo obtener respuesta del agente. Por favor intenta de nuevo.', usedDatabase, sentEmail };
  }

  async _executeDbAction(apiPath, params, databaseService, dynamoService) {
    try {
      if (apiPath === '/list-connections') {
        // Cargar conexiones desde DynamoDB
        const result = await dynamoService.getDbConnections('guest');
        if (!result.success) return { statusCode: 500, body: { error: result.error } };
        
        const connections = (result.connections || []).map(c => ({
          id: c.id || c.connectionId,
          name: c.name,
          type: c.type,
          host: c.host,
          database: c.database
        }));
        return { statusCode: 200, body: { connections, count: connections.length } };
      }

      if (apiPath === '/get-schema') {
        const connectionId = params.connectionId;
        // Asegurar que esté en memoria
        if (!databaseService.getConnection(connectionId)) {
          const dynResult = await dynamoService.getDbConnections('guest');
          if (dynResult.success) {
            dynResult.connections.forEach(conn => {
              const id = conn.id || conn.connectionId;
              if (id) databaseService.saveConnection(id, { ...conn, id });
            });
          }
        }
        const schemaResult = await databaseService.getSchema(connectionId);
        return { statusCode: schemaResult.success ? 200 : 404, body: schemaResult };
      }

      if (apiPath === '/execute-query') {
        const { connectionId, query } = params;
        // Asegurar que esté en memoria
        if (!databaseService.getConnection(connectionId)) {
          const dynResult = await dynamoService.getDbConnections('guest');
          if (dynResult.success) {
            dynResult.connections.forEach(conn => {
              const id = conn.id || conn.connectionId;
              if (id) databaseService.saveConnection(id, { ...conn, id });
            });
          }
        }
        const queryResult = await databaseService.executeQuery(connectionId, query);
        return { statusCode: queryResult.success ? 200 : 500, body: queryResult };
      }

      return { statusCode: 400, body: { error: `API path desconocido: ${apiPath}` } };
    } catch (error) {
      console.error('Error ejecutando DB action:', error);
      return { statusCode: 500, body: { error: error.message } };
    }
  }

  async _executeEmailAction(apiPath, params, sesService) {
    try {
      if (apiPath === '/send-email') {
        const { to_email, recipient, subject, content } = params;
        const toAddress = to_email || recipient;

        // Si no hay destinatario, devolver error indicativo para que el agente lo solicite
        if (!toAddress) {
          return {
            statusCode: 400,
            body: {
              error: 'Se requiere la dirección de email del destinatario. Por favor solicita al usuario su email antes de enviar.',
              requiresEmail: true
            }
          };
        }

        const result = await sesService.sendEmail({
          to: toAddress,
          subject: subject || 'Información de BrieAI',
          htmlBody: `
            <div style="font-family: 'Montserrat', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #D4D0CB; padding: 20px;">
              <div style="background-color: white; padding: 30px; border-radius: 10px;">
                <h1 style="color: #ABA0FB;">📊 BrieAI</h1>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                  <pre style="white-space: pre-wrap; font-family: inherit; color: #1A1A1A;">${content || ''}</pre>
                </div>
                <p style="color: #666; font-size: 14px; margin-top: 20px;">Enviado por <strong style="color: #ABA0FB;">BrieAI</strong> desde noreply@brieagent.com</p>
              </div>
            </div>
          `,
          textBody: content || subject
        });
        return { statusCode: 200, body: { success: true, message: `Email enviado exitosamente a ${toAddress}`, messageId: result.messageId } };
      }

      if (apiPath === '/send-analysis-report') {
        const { to_email, recipient, analysis_data, insights } = params;
        const toAddress = to_email || recipient;

        if (!toAddress) {
          return {
            statusCode: 400,
            body: {
              error: 'Se requiere la dirección de email del destinatario. Por favor solicita al usuario su email antes de enviar.',
              requiresEmail: true
            }
          };
        }

        const result = await sesService.sendAnalysisReport(toAddress, {
          summary: analysis_data || '',
          insights: insights || ''
        });
        return { statusCode: 200, body: { success: true, message: `Reporte enviado exitosamente a ${toAddress}`, messageId: result.messageId } };
      }

      return { statusCode: 400, body: { error: `Email action desconocida: ${apiPath}` } };
    } catch (error) {
      console.error('Error ejecutando email action:', error);
      return { statusCode: 500, body: { error: error.message } };
    }
  }

  async sendMessageWithKnowledgeBase(message, context = '') {
    try {
      console.log('📚 Usando Bedrock Knowledge Base:', this.knowledgeBaseId);
      
      // Construir el prompt con contexto de conversación e historial
      let enhancedMessage = `Eres BrieAI, un asistente inteligente especializado en análisis de datos y gestión de información. 
      
      Puedes ayudar con:
      - Conversaciones generales y saludos cordiales
      - Análisis de datos y consultas SQL
      - Información de la base de conocimiento cuando esté disponible
      - Explicar conceptos técnicos y responder preguntas
      
      Siempre responde de manera amigable y útil. Si no tienes información específica sobre un tema, ofrece ayuda alternativa o sugiere cómo puedes asistir mejor.\n\n`;
      
      if (context) {
        enhancedMessage += `Historial de conversación reciente:\n${context}\n\n`;
      }
      
      enhancedMessage += `Mensaje actual del usuario: ${message}`;

      const command = new RetrieveAndGenerateCommand({
        input: {
          text: enhancedMessage
        },
        retrieveAndGenerateConfiguration: {
          type: 'KNOWLEDGE_BASE',
          knowledgeBaseConfiguration: {
            knowledgeBaseId: this.knowledgeBaseId,
            modelArn: `arn:aws:bedrock:us-east-1::foundation-model/${this.modelId}`,
            retrievalConfiguration: {
              vectorSearchConfiguration: {
                numberOfResults: 5
              }
            }
          }
        }
      });

      console.log('Enviando comando a Bedrock Agent Runtime...');
      const response = await this.agentClient.send(command);
      console.log('Respuesta recibida:', JSON.stringify(response, null, 2));
      
      // Verificar si la respuesta es el mensaje genérico de "unable to assist"
      if (response.output.text && response.output.text.toLowerCase().includes('unable to assist')) {
        console.log('Knowledge Base respondió con mensaje genérico, usando modelo directo...');
        return await this.sendDirectMessage(enhancedMessage, context);
      }
      
      return {
        success: true,
        message: response.output.text,
        citations: response.citations || [],
        contextUsed: {
          database: !!context,
          knowledgeBase: response.citations?.length || 0
        }
      };

    } catch (error) {
      console.error('Error con Knowledge Base:', error.message);
      console.error('Error name:', error.name);
      console.error('Error code:', error.code);
      console.error('Full error:', error);
      
      // Si falla Knowledge Base, intentar con modelo directo
      console.log('Fallback a modelo directo...');
      return await this.sendDirectMessage(message, context);
    }
  }

  async sendDirectMessage(message, context = '') {
    try {
      console.log('🤖 BedrockService - Mensaje recibido:', message.substring(0, 100) + '...');
      console.log('📋 BedrockService - Contexto recibido:', context ? 'SÍ (' + context.length + ' chars)' : 'NO');
      
      let systemPrompt = `Eres BrieAI, un asistente inteligente y amigable especializado en análisis de datos y gestión de información.
      
Puedes ayudar con:
      - Conversaciones generales, saludos y preguntas básicas
      - Consultas SQL y análisis de datos
      - Información disponible en la base de conocimiento
      - Explicar conceptos técnicos y resolver dudas
      - Asistencia general con el sistema
      
Siempre responde de manera cordial y útil. Mantiene el contexto de la conversación y evita repetir saludos o presentaciones si ya has interactuado con el usuario.`;

      // Construir el mensaje con contexto
      let userMessage = message;
      if (context) {
        userMessage = `Historial de conversación reciente:\n${context}\n\nMensaje actual: ${message}`;
        console.log('📝 Mensaje final con contexto:', userMessage.substring(0, 300) + '...');
      } else {
        console.log('⚠️ Sin contexto - mensaje directo');
      }

      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.7,
        top_p: 0.9
      };

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload)
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      return {
        success: true,
        message: responseBody.content[0].text,
        usage: responseBody.usage,
        contextUsed: {
          database: false,
          knowledgeBase: 0,
          conversationHistory: !!context
        }
      };

    } catch (error) {
      throw error;
    }
  }

  async analyzeData(query, databaseSchema, sampleData) {
    try {
      const analysisPrompt = `
      Analiza la siguiente consulta y proporciona insights basados en el esquema de la base de datos y los datos de muestra:
      
      Consulta: ${query}
      
      Esquema de la base de datos:
      ${databaseSchema}
      
      Datos de muestra:
      ${sampleData}
      
      Por favor proporciona:
      1. Una consulta SQL optimizada si es aplicable
      2. Insights sobre los datos
      3. Recomendaciones de análisis adicional
      `;

      return await this.sendDirectMessage(analysisPrompt);
    } catch (error) {
      console.error('Error en análisis de datos:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al analizar los datos'
      };
    }
  }
}

module.exports = new BedrockService();
