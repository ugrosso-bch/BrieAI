# ─── Stage 1: dependencies ────────────────────────────────────────────────────
# Forzar linux/amd64 explícitamente (Mac M5 Pro es ARM64, Fargate corre x86_64)
# Usando ECR Public para evitar Docker Hub rate limits en CodeBuild
FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ─── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:20-alpine AS runtime
WORKDIR /app

# Instalar dumb-init para manejo correcto de señales en containers
RUN apk add --no-cache dumb-init

# Usuario no-root por seguridad
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copiar dependencias y código
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# No copiar archivos locales sensibles
# (el .dockerignore se encarga, pero esto es explícito)

USER nodejs

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

# dumb-init como PID 1 para manejo correcto de SIGTERM
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
