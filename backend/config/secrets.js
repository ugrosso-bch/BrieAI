/**
 * Secrets Manager loader
 * En producción (NODE_ENV=production) carga todos los secrets desde AWS Secrets Manager.
 * En desarrollo sigue usando dotenv (.env local).
 *
 * El secret en AWS debe llamarse: brieai/config/production
 * y contener un JSON con todas las claves del backend.
 */

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const SECRET_NAME = process.env.SECRET_NAME || 'brieai/config/production';
const REGION = process.env.AWS_REGION || 'us-east-1';

async function loadSecrets() {
  // En desarrollo, usar .env directamente
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔧 Modo desarrollo: usando variables de entorno locales (.env)');
    return;
  }

  console.log(`🔐 Cargando secrets desde AWS Secrets Manager: ${SECRET_NAME}`);

  try {
    const client = new SecretsManagerClient({ region: REGION });
    const command = new GetSecretValueCommand({ SecretId: SECRET_NAME });
    const response = await client.send(command);

    let secrets;
    if (response.SecretString) {
      secrets = JSON.parse(response.SecretString);
    } else {
      // SecretBinary (base64)
      secrets = JSON.parse(Buffer.from(response.SecretBinary, 'base64').toString('utf-8'));
    }

    // Inyectar en process.env (solo las que no estén ya seteadas por la Task Definition)
    for (const [key, value] of Object.entries(secrets)) {
      if (!process.env[key]) {
        process.env[key] = String(value);
      }
    }

    console.log(`✅ Secrets cargados correctamente (${Object.keys(secrets).length} variables)`);
  } catch (error) {
    console.error('❌ Error cargando secrets desde Secrets Manager:', error.message);
    console.error('   Asegurate de que la Task Role tenga permisos secretsmanager:GetSecretValue');
    process.exit(1); // Fallar en producción si no se pueden cargar los secrets
  }
}

module.exports = { loadSecrets };
