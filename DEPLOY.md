# BrieAI — Guía de Despliegue en AWS

## Arquitectura

```
GitHub (push to main)
    → CodePipeline
        → CodeBuild  (build Docker x86_64 → push ECR)
        → ECS Deploy (Backend + Frontend)

Internet → WAF → ALB (public subnets: us-east-1a/b/c)
                  ├── /api/*  → ECS Service: brieai-backend  (private subnets, port 3001)
                  └── /*      → ECS Service: brieai-frontend (private subnets, port 80)

ECS Task Role → Secrets Manager → todas las credenciales de la app
              → DynamoDB, S3, Bedrock, SES, SNS, Cognito, Lambda
```

---

## Orden de despliegue

### 1. Crear el secret en Secrets Manager

```bash
cd backend
node create-secret.js
```

Esto crea `brieai/config/production` con todos los valores del `.env` actual.

---

### 2. Crear los repositorios ECR

```bash
aws cloudformation deploy \
  --template-file "Templates CloudFormation/brieai-ecr.yaml" \
  --stack-name brieai-ecr \
  --capabilities CAPABILITY_NAMED_IAM
```

---

### 3. Build y push inicial de las imágenes

> **Nota Mac M5 Pro**: las imágenes se buildean para `linux/amd64`. Asegúrate de tener Docker Desktop con soporte Rosetta/QEMU habilitado.

```bash
# Login a ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  250935839247.dkr.ecr.us-east-1.amazonaws.com

# Backend
docker build --platform linux/amd64 \
  -t 250935839247.dkr.ecr.us-east-1.amazonaws.com/brieai-backend:latest \
  ./backend
docker push 250935839247.dkr.ecr.us-east-1.amazonaws.com/brieai-backend:latest

# Obtener el DNS del ALB (después de crear el stack ECS) para el REACT_APP_API_URL
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name brieai-ecs \
  --query "Stacks[0].Outputs[?OutputKey=='ALBDnsName'].OutputValue" \
  --output text)

# Frontend
docker build --platform linux/amd64 \
  --build-arg REACT_APP_API_URL="http://${ALB_DNS}/api" \
  --build-arg REACT_APP_COGNITO_USER_POOL_ID="us-east-1_3do6KDghK" \
  --build-arg REACT_APP_COGNITO_CLIENT_ID="1vg2hedmfpgr9r5vcqmiuq9jgc" \
  -t 250935839247.dkr.ecr.us-east-1.amazonaws.com/brieai-frontend:latest \
  ./frontend
docker push 250935839247.dkr.ecr.us-east-1.amazonaws.com/brieai-frontend:latest
```

---

### 4. Desplegar el cluster ECS + ALB + WAF

```bash
SECRET_ARN=$(aws secretsmanager describe-secret \
  --secret-id brieai/config/production \
  --query ARN --output text)

BACKEND_URI=250935839247.dkr.ecr.us-east-1.amazonaws.com/brieai-backend:latest
FRONTEND_URI=250935839247.dkr.ecr.us-east-1.amazonaws.com/brieai-frontend:latest

aws cloudformation deploy \
  --template-file "Templates CloudFormation/brieai-ecs.yaml" \
  --stack-name brieai-ecs \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    BackendImageUri=$BACKEND_URI \
    FrontendImageUri=$FRONTEND_URI \
    SecretArn=$SECRET_ARN
```

Una vez creado, la app estará en:  
`http://<ALB_DNS_NAME>` — Frontend  
`http://<ALB_DNS_NAME>/api/health` — Backend health check

---

### 5. Crear la GitHub Connection en CodeStar

1. Ir a **AWS Developer Tools → Connections**
2. Crear una conexión a GitHub
3. Autorizar con tu cuenta GitHub
4. Copiar el ARN de la conexión

---

### 6. Desplegar el pipeline CI/CD

```bash
GITHUB_CONNECTION_ARN="arn:aws:codestar-connections:us-east-1:250935839247:connection/XXXXX"

aws cloudformation deploy \
  --template-file "Templates CloudFormation/brieai-pipeline.yaml" \
  --stack-name brieai-pipeline \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    GitHubConnectionArn=$GITHUB_CONNECTION_ARN
```

---

## Flujo CI/CD después del setup

Cada `git push` a `main` dispara automáticamente:

```
Push to main
  → CodePipeline detecta el cambio (CodeStar Connection)
  → CodeBuild:
      - Buildea backend Docker image (linux/amd64)
      - Buildea frontend Docker image (linux/amd64)
      - Push a ECR con tag = primeros 8 chars del commit SHA
      - Genera imagedefinitions.json
  → ECS Deploy Backend (rolling update con circuit breaker)
  → ECS Deploy Frontend (rolling update con circuit breaker)
```

---

## Desarrollo local con Docker

```bash
# Copiar el .env del backend
cp backend/.env.example backend/.env
# Editar backend/.env con los valores reales

# Levantar ambos servicios
docker compose up --build

# Frontend en: http://localhost:3000
# Backend en:  http://localhost:3001
```

---

## Notas importantes

- **Arquitectura**: imágenes buildeadas para `linux/amd64` (Fargate X86_64)
- **Mac M5 Pro**: Docker Desktop debe tener habilitado "Use Rosetta for x86/amd64 emulation"
- **Secrets**: en producción las credenciales vienen de Secrets Manager, no de `.env`
- **WAF**: protege con reglas OWASP Common, SQL injection, Known Bad Inputs + rate limit (2000 req/IP)
- **Subnets**: ALB en públicas, ECS tasks en privadas (salen via NAT Gateway existente)
