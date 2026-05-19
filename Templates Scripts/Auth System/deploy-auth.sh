#!/bin/bash

# Script para desplegar sistema de autenticación Cognito + DynamoDB

set -e

echo "🔐 Desplegando sistema de autenticación..."

# Variables
STACK_NAME="demo-sharktank-auth"
TEMPLATE_FILE="../../Templates CloudFormation/cognito-dynamodb-auth.yaml"
REGION="us-east-1"

# Verificar que el template existe
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ Error: Template file not found: $TEMPLATE_FILE"
    exit 1
fi

# Verificar si el stack ya existe
if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION &>/dev/null; then
    echo "⚠️ Stack existente encontrado, actualizando..."
    aws cloudformation update-stack \
        --stack-name $STACK_NAME \
        --template-body "file://$TEMPLATE_FILE" \
        --parameters ParameterKey=Environment,ParameterValue=dev \
        --region $REGION \
        --capabilities CAPABILITY_IAM
    
    echo "⏳ Esperando que la actualización se complete..."
    aws cloudformation wait stack-update-complete \
        --stack-name $STACK_NAME \
        --region $REGION
else
    # Crear nuevo stack
    echo "📦 Creando stack CloudFormation..."
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body "file://$TEMPLATE_FILE" \
        --parameters ParameterKey=Environment,ParameterValue=dev \
        --region $REGION \
        --capabilities CAPABILITY_IAM

    echo "⏳ Esperando que el stack se complete..."
    aws cloudformation wait stack-create-complete \
        --stack-name $STACK_NAME \
        --region $REGION
fi

# Obtener outputs
echo "📋 Obteniendo información de configuración..."

USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text)

USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
    --output text)

CONVERSATIONS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ConversationsTableName`].OutputValue' \
    --output text)

DB_CONNECTIONS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseConnectionsTableName`].OutputValue' \
    --output text)

DOCUMENTS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DocumentsTableName`].OutputValue' \
    --output text)

echo ""
echo "✅ Sistema de autenticación desplegado exitosamente!"
echo ""
echo "🔐 Configuración de Cognito:"
echo "  User Pool ID: $USER_POOL_ID"
echo "  Client ID: $USER_POOL_CLIENT_ID"
echo ""
echo "📊 Tablas DynamoDB:"
echo "  Conversaciones: $CONVERSATIONS_TABLE"
echo "  Conexiones DB: $DB_CONNECTIONS_TABLE"
echo "  Documentos: $DOCUMENTS_TABLE"
echo ""
echo "🌐 Actualiza tu archivo .env con:"
echo "  COGNITO_USER_POOL_ID=$USER_POOL_ID"
echo "  COGNITO_CLIENT_ID=$USER_POOL_CLIENT_ID"
echo "  DYNAMODB_CONVERSATIONS_TABLE=$CONVERSATIONS_TABLE"
echo "  DYNAMODB_DB_CONNECTIONS_TABLE=$DB_CONNECTIONS_TABLE"
echo "  DYNAMODB_DOCUMENTS_TABLE=$DOCUMENTS_TABLE"