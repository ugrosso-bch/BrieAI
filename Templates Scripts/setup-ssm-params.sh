#!/bin/bash
# Crea los SSM Parameters que CodeBuild necesita para el build del frontend.
# Estos NO son secretos — son IDs públicos de Cognito.
# Ejecutar una sola vez antes del primer pipeline.

set -e

REGION="us-east-1"

# Cargar valores desde el .env del proyecto
source "$(dirname "$0")/../../backend/.env"

echo "Creando SSM Parameters en $REGION..."

aws ssm put-parameter \
  --name "/brieai/cognito/user_pool_id" \
  --value "$COGNITO_USER_POOL_ID" \
  --type "String" \
  --description "BrieAI Cognito User Pool ID" \
  --overwrite \
  --region $REGION

aws ssm put-parameter \
  --name "/brieai/cognito/client_id" \
  --value "$COGNITO_CLIENT_ID" \
  --type "String" \
  --description "BrieAI Cognito Client ID" \
  --overwrite \
  --region $REGION

echo "✅ SSM Parameters creados:"
echo "   /brieai/cognito/user_pool_id = $COGNITO_USER_POOL_ID"
echo "   /brieai/cognito/client_id    = $COGNITO_CLIENT_ID"
