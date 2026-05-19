# ─── Stage 1: build React app ─────────────────────────────────────────────────
# Forzar linux/amd64 explícitamente (Mac M5 Pro es ARM64, Fargate corre x86_64)
# Usando ECR Public para evitar Docker Hub rate limits en CodeBuild
FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build args para variables de entorno en tiempo de build
# Estas se inyectan desde CodeBuild / docker build --build-arg
ARG REACT_APP_API_URL
ARG REACT_APP_COGNITO_USER_POOL_ID
ARG REACT_APP_COGNITO_CLIENT_ID
ARG REACT_APP_NAME=BrieAI
ARG REACT_APP_VERSION=1.0.0

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_COGNITO_USER_POOL_ID=$REACT_APP_COGNITO_USER_POOL_ID
ENV REACT_APP_COGNITO_CLIENT_ID=$REACT_APP_COGNITO_CLIENT_ID
ENV REACT_APP_NAME=$REACT_APP_NAME
ENV REACT_APP_VERSION=$REACT_APP_VERSION

COPY . .
RUN npm run build

# ─── Stage 2: serve with Nginx ────────────────────────────────────────────────
FROM --platform=linux/amd64 public.ecr.aws/nginx/nginx:1.27-alpine AS runtime

# Copiar build y config de nginx
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Eliminar config default de nginx
RUN rm -f /etc/nginx/conf.d/default.conf.orig

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
