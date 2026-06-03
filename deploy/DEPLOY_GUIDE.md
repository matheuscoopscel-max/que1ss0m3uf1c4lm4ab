# OmniMedia — Guia de Deploy Completo

## Arquitetura

```
Internet
  ↓
Cloudflare (DNS + CDN + SSL)
  ├── seudominio.com       → Cloudflare Pages (frontend React)
  └── api.seudominio.com   → Oracle VPS (backend Node.js)
                                  ↓
                             Nginx :80/:443
                                  ↓
                             Node.js :3001 (PM2)
                                  ↓
                             PostgreSQL :5432
```

---

## PARTE 1 — Configurar a VPS Oracle

### 1.1 Conectar via SSH

```bash
ssh ubuntu@SEU_IP_DA_VPS
# ou com chave:
ssh -i ~/.ssh/oracle_key ubuntu@SEU_IP_DA_VPS
```

### 1.2 Rodar o setup inicial (uma única vez)

```bash
# Copia o script para a VPS
scp deploy/setup-vps.sh ubuntu@SEU_IP_DA_VPS:/tmp/

# Na VPS:
sudo bash /tmp/setup-vps.sh
```

---

## PARTE 2 — Deploy do Backend

### 2.1 Preparar o .env de produção

```bash
# Na VPS, cria o arquivo de configuração
sudo nano /var/www/omnimedia/.env
```

Cole o conteúdo de `deploy/.env.production` e preencha:

```bash
# Gera os secrets (rode no seu PC ou na VPS):
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  # JWT_ACCESS_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  # JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # MASTER_KEY
```

### 2.2 Enviar os arquivos do backend para a VPS

```bash
# No WSL, da raiz do projeto:
cd /mnt/d/Matheus/Sites/Omni/omnimedia

# Cria zip só do backend
zip -r backend-deploy.zip backend/ \
  -x "*/node_modules/*" -x "*/.env*"

# Envia para a VPS
scp backend-deploy.zip ubuntu@SEU_IP_DA_VPS:/tmp/omnimedia.zip
```

### 2.3 Rodar o deploy na VPS

```bash
# Na VPS:
sudo bash /tmp/deploy-backend.sh

# Verifica se subiu:
pm2 status
curl http://localhost:3001/api/health
```

---

## PARTE 3 — Configurar o Nginx

### 3.1 Instalar a config

```bash
# Envia a config do Nginx para a VPS
scp deploy/nginx.conf ubuntu@SEU_IP_DA_VPS:/tmp/

# Na VPS:
sudo cp /tmp/nginx.conf /etc/nginx/sites-available/omnimedia
sudo ln -sf /etc/nginx/sites-available/omnimedia /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testa e recarrega
sudo nginx -t && sudo systemctl reload nginx
```

### 3.2 Testar

```bash
# Do seu PC:
curl http://SEU_IP_DA_VPS/api/health
# Deve retornar: {"status":"ok",...}
```

---

## PARTE 4 — Deploy do Frontend no Cloudflare Pages

Veja `deploy/cloudflare-pages.md` para o passo a passo completo.

**Resumo:**
1. Faça push do projeto para o GitHub
2. No Cloudflare Pages, conecte o repositório
3. Configure: build command = `cd frontend && npm install && npm run build`
4. Adicione variável: `VITE_API_URL=https://SEU_IP_DA_VPS/api`
5. Deploy!

---

## PARTE 5 — SSL com Certbot (após comprar domínio)

```bash
# Na VPS, após apontar o DNS para o IP:
sudo certbot --nginx -d api.seudominio.com

# Teste renovação automática:
sudo certbot renew --dry-run
```

---

## Manutenção

```bash
# Ver logs em tempo real
pm2 logs omnimedia-api

# Reiniciar o backend
pm2 restart omnimedia-api

# Atualizar após novo patch (no WSL):
scp backend-deploy.zip ubuntu@SEU_IP_DA_VPS:/tmp/omnimedia.zip
ssh ubuntu@SEU_IP_DA_VPS "sudo bash /tmp/deploy-backend.sh"
```

---

## Checklist final

- [ ] VPS criada e acessível via SSH
- [ ] `setup-vps.sh` executado com sucesso
- [ ] `.env` de produção criado com secrets reais
- [ ] Backend rodando (`pm2 status` = online)
- [ ] `curl http://IP/api/health` retorna `{"status":"ok"}`
- [ ] Frontend buildado e deployado no Cloudflare Pages
- [ ] Frontend consegue chamar o backend (sem erros de CORS)
- [ ] Primeiro cadastro funciona e vira admin
