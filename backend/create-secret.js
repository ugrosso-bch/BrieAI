/**
 * Script de setup: crea el secret en AWS Secrets Manager con los valores del .env actual.
 * Ejecutar UNA SOLA VEZ al preparar el entorno de producción:
 *   node create-secret.js
 *
 * Si el secret ya existe lo actualiza (PutSecretValue).
 */

const { SecretsManagerClient, CreateSecretCommand, PutSecretValueCommand, DescribeSecretCommand } = require('@aws-sdk/client-secrets-manager');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const SECRET_NAME = 'brieai/config/production';
const REGION = process.env.AWS_REGION || 'us-east-1';

// Todas las variables que deben estar en el secret de producción
const SECRET_KEYS = [
  'AWS_REGION',
  'BEDROCK_MODEL_ID',
  'BEDROCK_AGENT_ID',
  'BEDROCK_AGENT_ALIAS_ID',
  'BEDROCK_KNOWLEDGE_BASE_ID',
  'BEDROCK_DATA_SOURCE_ID',
  'S3_BUCKET_NAME',
  'SNS_TOPIC_NAME',
  'SES_FROM_EMAIL',
  'SES_REGION',
  'COGNITO_USER_POOL_ID',
  'COGNITO_CLIENT_ID',
  'COGNITO_DOMAIN',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'DYNAMODB_CONVERSATIONS_TABLE',
  'DYNAMODB_DB_CONNECTIONS_TABLE',
  'DYNAMODB_DOCUMENTS_TABLE',
  'AWS_ACCOUNT_ID',
  'NODE_ENV',
  'PORT',
];

async function createOrUpdateSecret() {
  const client = new SecretsManagerClient({ region: REGION });

  // Construir el objeto con los valores actuales
  const secretValue = {};
  const missing = [];

  for (const key of SECRET_KEYS) {
    if (process.env[key]) {
      secretValue[key] = process.env[key];
    } else {
      missing.push(key);
    }
  }

  // Forzar NODE_ENV=production en el secret
  secretValue['NODE_ENV'] = 'production';

  if (missing.length > 0) {
    console.warn('⚠️  Variables no encontradas en .env (se omitirán del secret):');
    missing.forEach(k => console.warn(`   - ${k}`));
  }

  const secretString = JSON.stringify(secretValue, null, 2);
  console.log(`\n📋 Secret a crear/actualizar: ${SECRET_NAME}`);
  console.log(`   Variables incluidas: ${Object.keys(secretValue).length}`);

  try {
    // Verificar si ya existe
    await client.send(new DescribeSecretCommand({ SecretId: SECRET_NAME }));

    // Actualizar
    console.log('\n🔄 Secret ya existe, actualizando...');
    await client.send(new PutSecretValueCommand({
      SecretId: SECRET_NAME,
      SecretString: secretString
    }));
    console.log(`✅ Secret actualizado: ${SECRET_NAME}`);

  } catch (err) {
    if (err.name === 'ResourceNotFoundException') {
      // Crear nuevo
      console.log('\n➕ Creando nuevo secret...');
      const result = await client.send(new CreateSecretCommand({
        Name: SECRET_NAME,
        Description: 'BrieAI production configuration - managed by create-secret.js',
        SecretString: secretString,
        Tags: [
          { Key: 'Project', Value: 'BrieAI' },
          { Key: 'Environment', Value: 'production' }
        ]
      }));
      console.log(`✅ Secret creado: ${result.ARN}`);
    } else {
      throw err;
    }
  }

  console.log('\n💡 Próximos pasos:');
  console.log('   1. Verifica el secret en la consola de AWS Secrets Manager');
  console.log(`   2. Asegurate que el ECS Task Role tenga permiso: secretsmanager:GetSecretValue`);
  console.log(`   3. El backend lo leerá automáticamente al arrancar en producción`);
}

createOrUpdateSecret().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
