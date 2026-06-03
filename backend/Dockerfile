# FILE: backend/Dockerfile
# Build de produção da API OmniMedia.

FROM node:22-alpine AS base
WORKDIR /app

# Instala dependências (camada cacheável)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copia o código
COPY . .

# Porta exposta
EXPOSE 3001

# Healthcheck interno
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

# Executa migrations e inicia o servidor
CMD ["sh", "-c", "node scripts/migrate.js && node scripts/seed.js && node server.js"]
