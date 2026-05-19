/**
 * Actualiza los Action Groups para usar RETURN_CONTROL en lugar de Lambda.
 * Esto permite que el backend Node.js ejecute las acciones directamente,
 * evitando los problemas de SCP de Organizations.
 */
const {
  BedrockAgentClient,
  UpdateAgentActionGroupCommand,
  PrepareAgentCommand,
} = require('@aws-sdk/client-bedrock-agent');

require('dotenv').config();

const client = new BedrockAgentClient({ region: process.env.AWS_REGION || 'us-east-1' });
const AGENT_ID = process.env.BEDROCK_AGENT_ID;

const emailSchema = {
  openapi: '3.0.0',
  info: { title: 'BrieAI Email Actions', version: '1.0.0' },
  paths: {
    '/send-email': {
      post: {
        operationId: 'sendEmail',
        description: 'Envía un correo electrónico con información o datos. Usar cuando el usuario pida enviar algo por email/correo.',
        parameters: [
          { name: 'to_email', in: 'query', description: 'Email del destinatario. Default: ugrosso@bigcheese.com.uy', required: false, schema: { type: 'string' } },
          { name: 'subject', in: 'query', description: 'Asunto del correo', required: true, schema: { type: 'string' } },
          { name: 'content', in: 'query', description: 'Contenido del correo con los datos o información a enviar', required: true, schema: { type: 'string' } }
        ],
        responses: { '200': { description: 'Email enviado' } }
      }
    },
    '/send-analysis-report': {
      post: {
        operationId: 'sendAnalysisReport',
        description: 'Envía un reporte de análisis de datos por correo con formato HTML. Usar para resultados de análisis o consultas de BD.',
        parameters: [
          { name: 'to_email', in: 'query', description: 'Email destinatario. Default: ugrosso@bigcheese.com.uy', required: false, schema: { type: 'string' } },
          { name: 'analysis_data', in: 'query', description: 'Datos del análisis a incluir en el reporte', required: true, schema: { type: 'string' } },
          { name: 'insights', in: 'query', description: 'Conclusiones o recomendaciones del análisis', required: false, schema: { type: 'string' } }
        ],
        responses: { '200': { description: 'Reporte enviado' } }
      }
    }
  }
};

const dbSchema = {
  openapi: '3.0.0',
  info: { title: 'BrieAI Database Actions', version: '1.0.0' },
  paths: {
    '/list-connections': {
      post: {
        operationId: 'listConnections',
        description: 'Lista todas las conexiones de bases de datos disponibles con sus IDs. Usar SIEMPRE primero para obtener el connectionId correcto antes de ejecutar consultas.',
        responses: { '200': { description: 'Lista de conexiones' } }
      }
    },
    '/get-schema': {
      post: {
        operationId: 'getDatabaseSchema',
        description: 'Obtiene tablas y columnas de una base de datos para entender su estructura antes de hacer consultas.',
        parameters: [
          { name: 'connectionId', in: 'query', description: 'ID de la conexión (obtenido de list-connections)', required: true, schema: { type: 'string' } }
        ],
        responses: { '200': { description: 'Esquema de la BD' } }
      }
    },
    '/execute-query': {
      post: {
        operationId: 'executeQuery',
        description: 'Ejecuta una consulta SQL SELECT en la base de datos. Usar después de list-connections para obtener el connectionId y get-schema para conocer las tablas.',
        parameters: [
          { name: 'connectionId', in: 'query', description: 'ID de la conexión (obtenido de list-connections)', required: true, schema: { type: 'string' } },
          { name: 'query', in: 'query', description: 'Consulta SQL SELECT a ejecutar', required: true, schema: { type: 'string' } }
        ],
        responses: { '200': { description: 'Resultados de la consulta' } }
      }
    }
  }
};

async function updateActionGroup(id, name, schema) {
  console.log(`\n📋 Actualizando ${name} a RETURN_CONTROL...`);
  const command = new UpdateAgentActionGroupCommand({
    agentId: AGENT_ID,
    agentVersion: 'DRAFT',
    actionGroupId: id,
    actionGroupName: name,
    actionGroupExecutor: {
      customControl: 'RETURN_CONTROL'
    },
    apiSchema: {
      payload: JSON.stringify(schema)
    },
    actionGroupState: 'ENABLED'
  });

  const result = await client.send(command);
  console.log(`✅ ${name} actualizado: ${result.agentActionGroup.actionGroupState}`);
}

async function main() {
  try {
    console.log('🔄 Actualizando Action Groups a RETURN_CONTROL...');
    console.log('   Esto permite que el backend Node.js ejecute las acciones directamente\n');

    await updateActionGroup('RCFCIIJUN4', 'EmailActions', emailSchema);
    await updateActionGroup('TXWH5QOKG3', 'DatabaseActions', dbSchema);

    console.log('\n🔄 Preparando agente...');
    await client.send(new PrepareAgentCommand({ agentId: AGENT_ID }));
    console.log('✅ Agente preparado con RETURN_CONTROL');
    
    console.log('\n✅ Listo! El backend Node.js ahora ejecuta las acciones del agente directamente.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
