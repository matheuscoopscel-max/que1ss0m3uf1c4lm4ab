# OmniMedia Frontend — Deploy no Cloudflare Pages

## Pré-requisitos
- Conta na Cloudflare (gratuita)
- Repositório GitHub com o código do frontend

---

## Passo 1 — Variável de ambiente para produção

Crie o arquivo `frontend/.env.production`:

```
VITE_API_URL=https://SEU_IP_DA_VPS/api
```

Quando tiver domínio, troque por:
```
VITE_API_URL=https://api.seudominio.com/api
```

---

## Passo 2 — Testar o build localmente

```bash
cd frontend
npm run build
# Deve gerar a pasta dist/ sem erros
```

---

## Passo 3 — Configurar no Cloudflare Pages

1. Acesse **dash.cloudflare.com** → **Pages** → **Create a project**
2. Conecte seu repositório GitHub
3. Configure o build:

| Campo | Valor |
|-------|-------|
| Framework preset | Vite |
| Build command | `cd frontend && npm install && npm run build` |
| Build output directory | `frontend/dist` |
| Root directory | `/` (raiz do repositório) |

4. Em **Environment variables**, adicione:

| Variável | Valor |
|----------|-------|
| `VITE_API_URL` | `https://SEU_IP_DA_VPS/api` |
| `NODE_VERSION` | `20` |

5. Clique em **Save and Deploy**

---

## Passo 4 — Domínio personalizado (quando comprar)

1. No Cloudflare Pages → seu projeto → **Custom domains**
2. Adicione `www.seudominio.com` e `seudominio.com`
3. O Cloudflare configura o SSL automaticamente

Para o backend (api.seudominio.com):
- No DNS da Cloudflare, adicione um registro **A**:
  - Name: `api`
  - IPv4: `SEU_IP_DA_VPS`
  - Proxy: **Desativado** (nuvem cinza) — para o Certbot funcionar

---

## Resultado final

```
Usuário
  ↓
seudominio.com          → Cloudflare Pages (CDN global, SSL automático)
                               ↓ chamadas /api/*
api.seudominio.com      → Oracle VPS → Nginx → Node.js :3001
                                              ↓
                                         PostgreSQL :5432
```
