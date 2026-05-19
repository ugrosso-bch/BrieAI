#!/bin/bash

# Script para verificar el estado de la base de datos RDS

set -e

echo "🔍 Verificando estado de la base de datos..."

# Variables
STACK_NAME="demo-sharktank-rds"
REGION="us-east-1"
DB_NAME="sharktank_demo"
DB_USER="admin"
DB_PASSWORD="DemoShark123!"

# Obtener endpoint de RDS
DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text 2>/dev/null)

if [ -z "$DB_ENDPOINT" ]; then
    echo "❌ Error: No se pudo obtener el endpoint de RDS"
    echo "💡 Verifica que el stack esté desplegado: aws cloudformation describe-stacks --stack-name $STACK_NAME"
    exit 1
fi

# Verificar que mysql client está instalado
MYSQL_CLIENT="/opt/homebrew/opt/mysql-client/bin/mysql"
if [ ! -f "$MYSQL_CLIENT" ]; then
    if ! command -v mysql &> /dev/null; then
        echo "❌ Error: MySQL client no está instalado"
        exit 1
    else
        MYSQL_CLIENT="mysql"
    fi
fi

echo "🔗 Conectando a: $DB_ENDPOINT"

# Verificar conexión
if ! $MYSQL_CLIENT -h $DB_ENDPOINT -u $DB_USER -p$DB_PASSWORD -e "SELECT 1" &>/dev/null; then
    echo "❌ Error: No se puede conectar a la base de datos"
    exit 1
fi

echo "✅ Conexión exitosa!"

# Verificar base de datos
if ! $MYSQL_CLIENT -h $DB_ENDPOINT -u $DB_USER -p$DB_PASSWORD -e "USE $DB_NAME; SELECT 1;" &>/dev/null; then
    echo "⚠️  Base de datos '$DB_NAME' no existe"
    echo "💡 Ejecuta: ./populate-database.sh"
    exit 1
fi

# Obtener estadísticas
echo ""
echo "📊 Estadísticas de la base de datos:"

COMPANIES_COUNT=$($MYSQL_CLIENT -h $DB_ENDPOINT -u $DB_USER -p$DB_PASSWORD $DB_NAME -se "SELECT COUNT(*) FROM companies;" 2>/dev/null || echo "0")
INVESTORS_COUNT=$($MYSQL_CLIENT -h $DB_ENDPOINT -u $DB_USER -p$DB_PASSWORD $DB_NAME -se "SELECT COUNT(*) FROM investors;" 2>/dev/null || echo "0")
INVESTMENTS_COUNT=$($MYSQL_CLIENT -h $DB_ENDPOINT -u $DB_USER -p$DB_PASSWORD $DB_NAME -se "SELECT COUNT(*) FROM investments;" 2>/dev/null || echo "0")

echo "  • Empresas: $COMPANIES_COUNT"
echo "  • Inversores: $INVESTORS_COUNT"
echo "  • Inversiones: $INVESTMENTS_COUNT"

# Mostrar algunas empresas de ejemplo
if [ "$COMPANIES_COUNT" -gt 0 ]; then
    echo ""
    echo "🏢 Empresas de ejemplo:"
    $MYSQL_CLIENT -h $DB_ENDPOINT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT name, industry, valuation FROM companies LIMIT 3;" 2>/dev/null
fi

echo ""
echo "🔗 Para conectar manualmente:"
echo "  $MYSQL_CLIENT -h $DB_ENDPOINT -u $DB_USER -p$DB_PASSWORD $DB_NAME"