/**
 * Configura los Action Groups del agente BrieAI:
 * 1. EmailActions  -> brieai-email-actions Lambda (SES)
 * 2. DatabaseActions -> brieai-db-actions Lambda (MySQL/PostgreSQL via DynamoDB)
 */

const {
  BedrockAgentClient,
  CreateAgentActionGroupCommand,
  PrepareAgentCommand,
  CreateAgentAliasCommand,
  UpdateAgentAliasCommand,
} = require('@aws-sdk/client-bedrock-agent');

require('dotenv').config();

const client = new BedrockAgentClient({ region: process.env.AWS_REGION || 'us-east-1' });

const AGENT_ID = process.env.BEDROCK_AGENT_ID;
const ACCOUNT_ID = process.env.AWS_ACCOUNT_ID;
const REGION = process.env.AWS_REGION || 'us-east-1';

const EMAIL_LAMBDA_ARN = `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:brieai-email-actions`;
const DB_LAMBDA_ARN = `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:brieai-db-actions`;

// Schema OpenAPI para el action group de email
const emailSchema = {
  openapi: '3.0.0',
  info: {
    title: 'BrieAI Email Actions',
    version: '1.0.0',
    description: 'Envío de correos electrónicos a través de Amazon SES'
  },
  paths: {
    '/send-email': {
      post: {
        operationId: 'sendEmail',
        description: 'Envía un correo electrónico con información o datos al destinatario indicado. Usar cuando el usuario pida enviar información, reportes o datos por email/correo.',
        parameters: [
          {
            name: 'to_email',
            in: 'query',
            description: 'Dirección de email del destinatario. Si el usuario no especifica, usar ugrosso@bigcheese.com.uy',
            required: false,
            schema: { type: 'string' }
          },
          {
            name: 'subject',
            in: 'query',
            description: 'Asunto del correo electrónico',
            required: true,
            schema: { type: 'string' }
          },
          {
            name: 'content',
            in: 'query',
            description: 'Contenido completo del correo, incluyendo los datos o información a enviar',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': { description: 'Email enviado exitosamente' }
        }
      }
    },
    '/send-analysis-report': {
      post: {
        operationId: 'sendAnalysisReport',
        description: 'Envía un reporte de análisis de datos por correo electrónico con formato especial. Usar para enviar resultados de análisis, consultas de bases de datos, o reportes complejos.',
        parameters: [
          {
            name: 'to_email',
            in: 'query',
            description: 'Dirección de email del destinatario. Si el usuario no especifica, usar ugrosso@bigcheese.com.uy',
            required: false,
            schema: { type: 'string' }
          },
          {
            name: 'analysis_data',
            in: 'query',
            description: 'Los datos del análisis a incluir en el reporte',
            required: true,
            schema: { type: 'string' }
          },
          {
            name: 'insights',
            in: 'query',
            description: 'Insights, conclusiones o recomendaciones basadas en el análisis',
            required: false,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': { description: 'Reporte enviado exitosamente' }
        }
      }
    }
  }
};

// Schema OpenAPI para el action group de base de datos
const dbSchema = {
  openapi: '3.0.0',
  info: {
    title: 'BrieAI Database Actions',
    version: '1.0.0',
    description: 'Consultas y análisis de bases de datos SQL'
  },
  paths: {
    '/list-connections': {
      post: {
        operationId: 'listConnections',
        description: 'Lista todas las conexiones de bases de datos disponibles. Usar SIEMPRE antes de execute-query para obtener los IDs de conexión correctos.',
        responses: {
          '200': { description: 'Lista de conexiones disponibles con sus IDs' }
        }
      }
    },
    '/get-schema': {
      post: {
        operationId: 'getDatabaseSchema',
        description: 'Obtiene el esquema completo (tablas y columnas) de una base de datos. Usar para entender la estructura antes de hacer consultas.',
        parameters: [
          {
            name: 'connectionId',
            in: 'query',
            description: 'ID de la conexión de base de datos (obtenido de list-connections)',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': { description: 'Esquema de la base de datos' }
        }
      }
    },
    '/execute-query': {
      post: {
        operationId: 'executeQuery',
        description: 'Ejecuta una consulta SQL SELECT en la base de datos especificada. Usar cuando el usuario pida datos específicos de una base de datos. Primero usar list-connections para obtener el connectionId correcto.',
        parameters: [
          {
            name: 'connectionId',
            in: 'query',
            description: 'ID de la conexión de base de datos (obtenido de list-connections)',
            required: true,
            schema: { type: 'string' }
          },
          {
            name: 'query',
            in: 'query',
            description: 'Consulta SQL SELECT a ejecutar. Solo se permiten consultas de lectura.',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': { description: 'Resultados de la consulta SQL' }
        }
      }
    }
  }
};

async function createActionGroup(name, description, lambdaArn, schema) {
  try {
    console.log(`\n📋 Creando Action Group: ${name}...`);
    const command = new CreateAgentActionGroupCommand({
      agentId: AGENT_ID,
      agentVersion: 'DRAFT',
      actionGroupName: name,
      description,
      actionGroupExecutor: {
        lambda: lambdaArn
      },
      apiSchema: {
        payload: JSON.stringify(schema)
      },
      actionGroupState: 'ENABLED'
    });

    const result = await client.send(command);
    console.log(`✅ ${name} creado: ${result.agentActionGroup.actionGroupId}`);
    return result.agentActionGroup;
  } catch (error) {
    if (error.name === 'ConflictException') {
      console.log(`⚠️  ${name} ya existe`);
      return null;
    }
    throw error;
  }
}

async function prepareAgent() {
  console.log('\n🔄 Preparando agente BrieAI...');
  await client.send(new PrepareAgentCommand({ agentId: AGENT_ID }));
  console.log('✅ Agente preparado');
}

async function main() {
  try {
    console.log('🚀 Configurando Action Groups de BrieAI');
    console.log(`   Agent ID: ${AGENT_ID}`);
    console.log(`   Email Lambda: ${EMAIL_LAMBDA_ARN}`);
    console.log(`   DB Lambda: ${DB_LAMBDA_ARN}`);

    await createActionGroup(
      'EmailActions',
      'Permite a BrieAI enviar correos electrónicos con información, datos y reportes de análisis usando Amazon SES',
      EMAIL_LAMBDA_ARN,
      emailSchema
    );

    await createActionGroup(
      'DatabaseActions',
      'Permite a BrieAI consultar bases de datos SQL (MySQL y PostgreSQL) para obtener datos en tiempo real',
      DB_LAMBDA_ARN,
      dbSchema
    );

    await prepareAgent();

    console.log('\n✅ Configuración completa!');
    console.log('💡 BrieAI ahora puede:');
    console.log('   - Enviar emails: "Mándame por correo los datos de ventas"');
    console.log('   - Consultar DBs: "¿Cuántos clientes tenemos en la base de datos?"');
    console.log('   - Combinar: "Consulta la base de datos y envíame el reporte por email"');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

main();
