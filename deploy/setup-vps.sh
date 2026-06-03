#!/bin/bash
# =============================================================================
# OmniMedia — Setup completo da VPS Oracle Ubuntu 22.04
# Execute como root ou com sudo: bash setup-vps.sh
# =============================================================================
set -e

echo "======================================"
echo " OmniMedia VPS Setup — Oracle Ubuntu 22.04"
echo "======================================"

# ── 1. Sistema base ────────────────────────────────────────────────────────────
echo ""
echo "[1/8] Atualizando sistema..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Dependências ────────────────────────────────────────────────────────────
echo "[2/8] Instalando dependências..."
apt-get install -y -qq \
  curl wget git unzip \
  nginx certbot python3-certbot-nginx \
  postgresql postgresql-contrib \
  ufw fail2ban \
  build-essential

# ── 3. Node.js 20 via NodeSource ───────────────────────────────────────────────
echo "[3/8] Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo "Node: $(node -v) | npm: $(npm -v)"

# ── 4. PM2 (gerenciador de processos) ─────────────────────────────────────────
echo "[4/8] Instalando PM2..."
npm install -g pm2
pm2 startup systemd -u www-data --hp /var/www | tail -1 | bash || true

# ── 5. PostgreSQL ──────────────────────────────────────────────────────────────
echo "[5/8] Configurando PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql

sudo -u postgres psql << 'PSQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'omnimedia') THEN
    CREATE USER omnimedia WITH PASSWORD 'CHANGE_THIS_PASSWORD';
  END IF;
END $$;
SELECT 'Criando banco...' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'omnimedia_db');
PSQL

sudo -u postgres createdb -O omnimedia omnimedia_db 2>/dev/null || echo "Banco já existe"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE omnimedia_db TO omnimedia;"

# ── 6. Firewall (UFW) ─────────────────────────────────────────────────────────
echo "[6/8] Configurando firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 5432/tcp  # PostgreSQL não exposto externamente
echo "Firewall OK"

# ── 7. Regras iptables Oracle (a Oracle bloqueia por padrão) ──────────────────
echo "[7/8] Abrindo portas na Oracle..."
iptables -I INPUT -p tcp --dport 80  -j ACCEPT
iptables -I INPUT -p tcp --dport 443 -j ACCEPT
# Persiste as regras
apt-get install -y iptables-persistent
netfilter-persistent save

# ── 8. Diretório da aplicação ──────────────────────────────────────────────────
echo "[8/8] Criando diretório da aplicação..."
mkdir -p /var/www/omnimedia
chown -R www-data:www-data /var/www/omnimedia
mkdir -p /var/log/omnimedia
chown -R www-data:www-data /var/log/omnimedia

echo ""
echo "======================================"
echo " Setup base concluído!"
echo " Próximos passos: execute deploy-backend.sh"
echo "======================================"
