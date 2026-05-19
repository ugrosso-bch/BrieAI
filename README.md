# BrieAI

Una plataforma de análisis inteligente que integra un asistente virtual especializado basado en Claude (AWS Bedrock), gestión de bases de datos y una base de conocimiento dinámica.

## 🚀 Características

- **BrieAI Agent**: Asistente virtual especializado en análisis de datos usando AWS Bedrock
- **Gestión de Bases de Datos**: Conexiones dinámicas a MySQL, PostgreSQL y MongoDB
- **Base de Conocimiento**: Subida y gestión de archivos para alimentar el contexto del asistente
- **Notificaciones Inteligentes**: Sistema de alertas por email usando Amazon SNS
- **Interfaz Moderna**: Diseño responsivo y minimalista
- **Análisis de Datos**: Capacidades de análisis y consulta de datos integradas

## 🎨 Diseño

### Paleta de Colores
- **Violeta**: `#ABA0FB` - Color principal para elementos interactivos
- **Amarillo**: `#FAE428` - Color de acento para destacar elementos
- **Beige**: `#D4D0CB` - Color de fondo principal
- **Negro**: `#1A1A1A` - Color de texto y elementos de contraste

### Tipografía
- **Montserrat** - Fuente principal para toda la aplicación

## 🏗️ Arquitectura

### Frontend (React + TypeScript)
- **React 18** con TypeScript
- **React Router** para navegación
- **Axios** para comunicación con API
- **Lucide React** para iconos
- **CSS personalizado** con variables CSS

### Backend (Node.js + Express)
- **Express.js** como framework web
- **AWS SDK** para integración con servicios AWS
- **Multer** para manejo de archivos
- **Drivers de bases de datos** (mysql2, pg, mongodb)

### Servicios AWS
- **AWS Bedrock** - Claude para procesamiento de lenguaje natural
- **Amazon S3** - Almacenamiento de archivos de base de conocimiento
- **Amazon SNS** - Sistema de notificaciones por email
- **AWS IAM** - Gestión de permisos y roles
- **CloudWatch** - Monitoreo y logs

## 📋 Requisitos Previos

- Node.js 18 o superior
- npm o yarn
- Cuenta de AWS con acceso a Bedrock
- Credenciales AWS configuradas

## 🛠️ Instalación

### 1. Clonar el repositorio
\`\`\`bash
git clone <repository-url>
cd BrieAI
\`\`\`

### 2. Instalar dependencias
\`\`\`bash
# Instalar dependencias de todos los proyectos
npm run install-all

# O instalar manualmente
npm install
cd backend && npm install
cd ../frontend && npm install
\`\`\`

### 3. Configurar variables de entorno

Copiar el archivo de ejemplo y configurar las variables:
\`\`\`bash
cp backend/.env.example backend/.env
\`\`\`

Editar \`backend/.env\` con tus credenciales:
\`\`\`env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key

# Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
BEDROCK_AGENT_ID=VWPGUQ7VPZ
BEDROCK_AGENT_ALIAS_ID=KMB6T1N7GB
BEDROCK_KNOWLEDGE_BASE_ID=NZHNXOPXFT

# S3 Configuration
S3_BUCKET_NAME=brieai-documents

# SNS Configuration
SNS_TOPIC_NAME=BrieAI-Notifications

# Server Configuration
PORT=3001
NODE_ENV=development
\`\`\`

### 4. Desplegar infraestructura AWS (Opcional)

Usar los templates de CloudFormation incluidos:
\`\`\`bash
# Desplegar infraestructura base
aws cloudformation create-stack \\
  --stack-name demo-shark-tank-infrastructure \\
  --template-body file://Templates\\ CloudFormation/demo-shark-tank-infrastructure.yaml \\
  --capabilities CAPABILITY_NAMED_IAM \\
  --parameters ParameterKey=Environment,ParameterValue=dev

# Desplegar SNS para notificaciones
aws cloudformation create-stack \\
  --stack-name demo-shark-tank-sns \\
  --template-body file://Templates\\ CloudFormation/sns-notifications.yaml \\
  --capabilities CAPABILITY_NAMED_IAM \\
  --parameters ParameterKey=Environment,ParameterValue=dev

# Desplegar instancia EC2 (opcional)
aws cloudformation create-stack \\
  --stack-name demo-shark-tank-ec2 \\
  --template-body file://Templates\\ CloudFormation/demo-shark-tank-ec2-deployment.yaml \\
  --parameters ParameterKey=KeyPairName,ParameterValue=tu-key-pair \\
               ParameterKey=VpcId,ParameterValue=vpc-xxxxxxxx \\
               ParameterKey=SubnetId,ParameterValue=subnet-xxxxxxxx
\`\`\`

## 🚀 Ejecución

### Desarrollo
\`\`\`bash
# Ejecutar frontend y backend simultáneamente
npm run dev

# O ejecutar por separado
npm run server  # Backend en puerto 3001
npm run client  # Frontend en puerto 3000
\`\`\`

### Producción
\`\`\`bash
# Backend
cd backend
npm start

# Frontend (construir y servir)
cd frontend
npm run build
npx serve -s build -l 3000
\`\`\`

## 📁 Estructura del Proyecto

\`\`\`
DemoSharkTank/
├── backend/                 # API Node.js
│   ├── routes/             # Rutas de la API
│   ├── services/           # Servicios (Bedrock, S3, DB)
│   ├── config/             # Configuraciones
│   └── server.js           # Servidor principal
├── frontend/               # Aplicación React
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── pages/          # Páginas principales
│   │   ├── services/       # Servicios de API
│   │   └── types/          # Tipos TypeScript
│   └── public/             # Archivos estáticos
├── Templates CloudFormation/ # Templates de infraestructura
└── package.json            # Configuración principal
\`\`\`

## 🔧 Configuración de AWS

### Permisos IAM Requeridos
- \`bedrock:InvokeModel\`
- \`s3:GetObject\`, \`s3:PutObject\`, \`s3:DeleteObject\`, \`s3:ListBucket\`
- \`sns:Publish\`, \`sns:Subscribe\`, \`sns:Unsubscribe\`, \`sns:ListSubscriptionsByTopic\`, \`sns:CreateTopic\`
- \`logs:CreateLogGroup\`, \`logs:CreateLogStream\`, \`logs:PutLogEvents\`

### Modelos de Bedrock Soportados
- \`anthropic.claude-3-sonnet-20240229-v1:0\`
- \`anthropic.claude-3-haiku-20240307-v1:0\`
- \`anthropic.claude-instant-v1\`

## 📖 Uso

### 1. Chat con BrieAI
- Navega a la sección de Chat (página principal)
- Selecciona una conexión de base de datos (opcional)
- Escribe tu pregunta y presiona Enter
- BrieAI responderá usando el contexto de la base de datos y conocimiento disponible

### 2. Gestión de Bases de Datos
- Ve a la sección "Bases de Datos"
- Crea nuevas conexiones especificando tipo, host, puerto, etc.
- Prueba las conexiones antes de guardarlas
- Ejecuta consultas SQL directamente en la interfaz
- Visualiza esquemas de bases de datos

### 3. Base de Conocimiento
- Accede a la sección "Base de Conocimiento"
- Sube archivos (TXT, PDF, DOC, etc.) que servirán como contexto
- Organiza archivos por categorías
- Busca contenido específico en los archivos
- Los archivos se almacenan en S3 y se usan automáticamente por BrieAI

### 4. Notificaciones
- Ve a la sección "Notificaciones"
- Suscribe emails para recibir alertas automáticas
- Recibe notificaciones cuando se agregan/eliminan conexiones de DB
- Recibe notificaciones cuando se suben/eliminan archivos de la base de conocimiento
- Envía notificaciones de prueba para verificar la configuración

## 🔍 Funcionalidades Avanzadas

### Análisis de Datos
- BrieAI puede analizar consultas SQL y proporcionar insights
- Optimización automática de consultas
- Recomendaciones basadas en esquemas de base de datos

### Búsqueda Inteligente
- Búsqueda de texto completo en la base de conocimiento
- Resultados con contexto y relevancia
- Integración automática en respuestas del chatbot

### Monitoreo
- Logs estructurados con CloudWatch
- Métricas de uso y rendimiento
- Alertas configurables

## 🚨 Solución de Problemas

### Error de conexión a Bedrock
- Verificar credenciales AWS
- Confirmar que la región soporta Bedrock
- Revisar permisos IAM

### Error de subida de archivos
- Verificar configuración del bucket S3
- Confirmar permisos de escritura
- Revisar límites de tamaño de archivo

### Problemas de conexión a base de datos
- Verificar credenciales de base de datos
- Confirmar conectividad de red
- Revisar configuración de firewall

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (\`git checkout -b feature/AmazingFeature\`)
3. Commit tus cambios (\`git commit -m 'Add some AmazingFeature'\`)
4. Push a la rama (\`git push origin feature/AmazingFeature\`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo \`LICENSE\` para más detalles.

## 🙏 Agradecimientos

- AWS Bedrock por las capacidades de IA
- Anthropic por Claude
- La comunidad de React y Node.js
- Montserrat font family

## 📞 Soporte

Para soporte y preguntas:
- Crear un issue en GitHub
- Revisar la documentación de AWS Bedrock
- Consultar los logs de CloudWatch para debugging

---

**BrieAI** - Plataforma de Análisis Inteligente powered by AWS 🚀
