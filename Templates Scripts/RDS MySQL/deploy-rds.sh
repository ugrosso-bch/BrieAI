#!/bin/bash

# Script para desplegar RDS MySQL para Demo Shark Tank

set -e

echo "🚀 Desplegando RDS MySQL para Demo Shark Tank..."

# Variables
STACK_NAME="demo-sharktank-rds"
TEMPLATE_FILE="Templates CloudFormation/rds-mysql-demo.yaml"
REGION="us-east-1"

# Verificar que el template existe
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ Error: Template file not found: $TEMPLATE_FILE"
    exit 1
fi

# Primero eliminar stack fallido si existe
echo "🧽 Verificando stack existente..."
if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION &>/dev/null; then
    echo "⚠️ Stack existente encontrado, eliminando..."
    aws cloudformation delete-stack --stack-name $STACK_NAME --region $REGION
    aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME --region $REGION
    echo "✅ Stack eliminado"
fi

# Desplegar stack
echo "📦 Creando stack CloudFormation..."
aws cloudformation create-stack \
    --stack-name $STACK_NAME \
    --template-body "file://$TEMPLATE_FILE" \
    --parameters ParameterKey=Environment,ParameterValue=dev \
                 ParameterKey=VpcId,ParameterValue=vpc-06fadc1e725cc0625 \
                 ParameterKey=SubnetId,ParameterValue=subnet-027544068fd96b43d \
                 ParameterKey=DBUsername,ParameterValue=admin \
                 ParameterKey=DBPassword,ParameterValue=DemoShark123! \
    --region $REGION \
    --capabilities CAPABILITY_IAM

echo "⏳ Esperando que el stack se complete..."
aws cloudformation wait stack-create-complete \
    --stack-name $STACK_NAME \
    --region $REGION

# Obtener outputs
echo "📋 Obteniendo información de conexión..."
DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text)

DB_PORT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabasePort`].OutputValue' \
    --output text)

echo ""
echo "✅ RDS MySQL desplegado exitosamente!"
echo ""
echo "📊 Información de conexión:"
echo "  Endpoint: $DB_ENDPOINT"
echo "  Puerto: $DB_PORT"
echo "  Base de datos: sharktank_demo"
echo "  Usuario: admin"
echo "  Contraseña: DemoShark123!"
echo ""
echo "🔧 String de conexión:"
echo "  mysql://admin:DemoShark123!@$DB_ENDPOINT:$DB_PORT/sharktank_demo"
echo ""
echo "📝 Para popular con datos de ejemplo, ejecuta:"
echo "  mysql -h $DB_ENDPOINT -u admin -pDemoShark123! sharktank_demo < sample-data.sql"
echo ""
echo "🌐 Actualiza tu archivo .env con:"
echo "  MYSQL_HOST=$DB_ENDPOINT"
echo "  MYSQL_PORT=$DB_PORT"
echo "  MYSQL_USER=admin"
echo "  MYSQL_PASSWORD=DemoShark123!"
echo "  MYSQL_DATABASE=sharktank_demo"