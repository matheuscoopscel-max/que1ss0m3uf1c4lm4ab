#!/bin/bash
# =============================================================================
# OmniMedia — Deploy do Backend na VPS
# Execute após setup-vps.sh
# Uso: bash deploy-backend.sh
# =============================================================================
set -e

APP_DIR="/var/www/omnimedia"
REPO_URL="${REPO_URL:-}"  # Opcional: URL do seu repositório Git

echo "======================================"
echo " OmniMedia Backend Deploy"
echo "======================================"

# ── Opção A: Upload direto (sem Git) ──────────────────────────────────────────
# Se não tiver repositório, o script espera que você já tenha feito upload
# do zip via scp. Ex: scp omnimedia-patch24.zip ubuntu@IP:/tmp/
if [ -f "/tmp/omnimedia.zip" ]; then
  echo "Extraindo upload..."
  unzip -o /tmp/omnimedia.zip -d /tmp/omnimedia-extract/
  cp -r /tmp/omnimedia-extract/omnimedia/backend/* "$APP_DIR/"
  rm -rf /tmp/omnimedia-extract
fi

# ── Opção B: Git clone/pull ────────────────────────────────────────────────────
if [ -n "$REPO_URL" ]; then
  if [ -d "$APP_DIR/.git" ]; then
    echo "Atualizando repositório..."
    cd "$APP_DIR" && git pull
  else
    echo "Clonando repositório..."
    git clone "$REPO_URL" /tmp/omnimedia-repo
    cp -r /tmp/omnimedia-repo/backend/* "$APP_DIR/"
  fi
fi

# ── Instala dependências ───────────────────────────────────────────────────────
echo "Instalando dependências npm..."
cd "$APP_DIR"
npm install --omit=dev

# ── Cria/verifica .env de produção ────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  echo ""
  echo "⚠  Arquivo .env não encontrado!"
  echo "   Crie o arquivo em $APP_DIR/.env antes de continuar."
  echo "   Use o template em deploy/.env.production como base."
  echo ""
  exit 1
fi

# ── Roda migrations ───────────────────────────────────────────────────────────
echo "Rodando migrations..."
cd "$APP_DIR" && npm run migrate

# ── PM2: inicia ou reinicia ────────────────────────────────────────────────────
echo "Gerenciando PM2..."
if pm2 list | grep -q "omnimedia-api"; then
  pm2 restart omnimedia-api
else
  pm2 start server.js \
    --name omnimedia-api \
    --instances 1 \
    --max-memory-restart 400M \
    --log /var/log/omnimedia/app.log \
    --error /var/log/omnimedia/error.log \
    --time
fi

pm2 save

echo ""
echo "✓ Backend rodando!"
echo "  Status: pm2 status"
echo "  Logs:   pm2 logs omnimedia-api"
