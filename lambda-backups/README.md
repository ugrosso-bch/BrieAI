# 🔒 Respaldo de Funciones Lambda - BrieAI

**Fecha de respaldo:** 31 de agosto de 2025  
**Proyecto:** Demo Shark Tank - BrieAI  
**Total de horas:** 23 horas de desarrollo  

## 📋 Funciones Lambda Respaldadas

### 1. **brieai-kb-auto-sync**
- **Propósito:** Sincronización automática de base de conocimiento
- **Trigger:** S3 bucket events
- **Integración:** AWS Bedrock Knowledge Base

### 2. **brieai-calendar-actions** 
- **Propósito:** Integración con Google Calendar
- **Funcionalidades:**
  - Listar eventos reales del calendario
  - Crear nuevos eventos
  - Verificar disponibilidad
- **Integración:** Google Calendar API + AWS Secrets Manager

### 3. **brieai-db-actions**
- **Propósito:** Conexión y consulta de bases de datos
- **Soporta:** MySQL, PostgreSQL, MongoDB
- **Funcionalidades:**
  - Ejecutar consultas SQL
  - Obtener esquemas de BD
  - Validar conexiones

### 4. **brieai-email-actions**
- **Propósito:** Envío de correos electrónicos
- **Funcionalidades:**
  - Envío de emails con templates HTML
  - Diseño personalizado BrieAI
  - Integración con Amazon SES

### 5. **brieai-google-calendar**
- **Propósito:** Funciones auxiliares de Google Calendar
- **Estado:** Función complementaria

## 🔧 Configuración AWS

### Permisos IAM Requeridos:
- `bedrock:InvokeModel`
- `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`
- `ses:SendEmail`
- `secretsmanager:GetSecretValue`
- `rds:DescribeDBInstances`
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`

### Servicios Integrados:
- **AWS Bedrock:** Claude 3.5 Sonnet para IA
- **Amazon S3:** Almacenamiento de documentos
- **Amazon SES:** Envío de correos
- **AWS Secrets Manager:** Tokens de Google Calendar
- **Amazon RDS:** Base de datos MySQL
- **Amazon SNS:** Notificaciones

## 🚀 Restauración

Para restaurar cualquier función:

```bash
# Ejemplo: Restaurar función de calendar
cd brieai-calendar-actions
zip -r ../restore-calendar.zip .
aws lambda update-function-code --function-name brieai-calendar-actions --zip-file fileb://restore-calendar.zip
```

## 📊 Estadísticas del Proyecto

- **Tiempo total:** 23 horas
- **Funciones Lambda:** 5
- **Integraciones:** 6 (Bedrock, S3, SES, Secrets Manager, RDS, Google Calendar)
- **Lenguajes:** Python (Lambda), Node.js (Backend), TypeScript/React (Frontend)
- **Líneas de código:** ~2000+ líneas

## 🎯 Demo Shark Tank

Este respaldo garantiza que todas las funcionalidades de BrieAI estén preservadas para:
- Demo en vivo
- Respaldo de seguridad
- Futuras mejoras
- Documentación técnica

---

**BrieAI** - Plataforma de Análisis Inteligente powered by AWS 🚀