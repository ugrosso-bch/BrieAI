#!/bin/bash

# Script para popular la base de datos RDS con datos de ejemplo

set -e

echo "📊 Populando base de datos RDS MySQL con datos de ejemplo..."

# Variables
STACK_NAME="demo-sharktank-rds"
REGION="us-east-1"
DB_NAME="sharktank_demo"
DB_USER="admin"
DB_PASSWORD="DemoShark123!"
SQL_FILE="sample-data.sql"

# Verificar que el archivo SQL existe
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Error: Archivo SQL no encontrado: $SQL_FILE"
    exit 1
fi

DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text 2>/dev/null)

if [ -z "$DB_ENDPOINT" ]; then
    echo "❌ Error: No se pudo obtener el endpoint de RDS. ¿Está desplegado el stack?"
    echo "💡 Ejecuta primero: ./deploy-rds.sh"
    exit 1
fi

echo "🔗 Conectando a: $DB_ENDPOINT"

# Verificar que mysql client está instalado
MYSQL_CLIENT="/opt/homebrew/opt/mysql-client/bin/mysql"
if [ ! -f "$MYSQL_CLIENT" ]; then
    if ! command -v mysql &> /dev/null; then
        echo "❌ Error: MySQL client no está instalado"
        echo "💡 Instala con: brew install mysql-client"
        exit 1
    else
        MYSQL_CLIENT="mysql"
    fi
fi

# Esperar a que RDS esté disponible
echo "⏳ Esperando que RDS esté disponible..."
timeout=300
counter=0
while ! $MYSQL_CLIENT -h $DB_ENDPOINT -u admin -pDemoShark123! -e "SELECT 1" &>/dev/null; do
    if [ $counter -ge $timeout ]; then
        echo "❌ Timeout esperando RDS"
        exit 1
    fi
    echo "  Esperando... ($counter/$timeout segundos)"
    sleep 10
    counter=$((counter + 10))
done

echo "✅ RDS disponible!"

# Crear base de datos si no existe
echo "🗄️ Verificando base de datos..."
$MYSQL_CLIENT -h $DB_ENDPOINT -u $DB_USER -p$DB_PASSWORD -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;"

# Popular base de datos
echo "📝 Ejecutando script SQL..."
$MYSQL_CLIENT -h $DB_ENDPOINT -u $DB_USER -p$DB_PASSWORD $DB_NAME < $SQL_FILE

# Verificar que los datos se insertaron correctamente
echo "🔍 Verificando datos insertados..."
COMPANIES_COUNT=$($MYSQL_CLIENT -h $DB_ENDPOINT -u $DB_USER -p$DB_PASSWORD $DB_NAME -se "SELECT COUNT(*) FROM companies;")
INVESTORS_COUNT=$($MYSQL_CLIENT -h $DB_ENDPOINT -u $DB_USER -p$DB_PASSWORD $DB_NAME -se "SELECT COUNT(*) FROM investors;")
INVESTMENTS_COUNT=$($MYSQL_CLIENT -h $DB_ENDPOINT -u $DB_USER -p$DB_PASSWORD $DB_NAME -se "SELECT COUNT(*) FROM investments;")

echo ""
echo "✅ Base de datos populada exitosamente!"
echo ""
echo "📊 Datos insertados:"
echo "  • $COMPANIES_COUNT empresas"
echo "  • $INVESTORS_COUNT inversores"
echo "  • $INVESTMENTS_COUNT inversiones"
echo "  • 3 vistas para análisis"
echo ""
echo "🔗 Información de conexión:"
echo "  Host: $DB_ENDPOINT"
echo "  Base de datos: $DB_NAME"
echo "  Usuario: $DB_USER"
echo ""
echo "🧪 Prueba algunas consultas:"
echo "  $MYSQL_CLIENT -h $DB_ENDPOINT -u $DB_USER -p$DB_PASSWORD $DB_NAME"
echo "  SELECT * FROM companies LIMIT 5;"
echo "  SELECT * FROM investment_summary;"
echo "  SELECT * FROM industry_performance;"