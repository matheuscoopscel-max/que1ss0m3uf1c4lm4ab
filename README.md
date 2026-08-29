# OmniMedia — Cortes

Plataforma de venda de packs digitais de vídeo ("Cortes"): acesso
vitalício, pagamento único via Mercado Pago, área privada com biblioteca
de conteúdo e download, grupo do Telegram complementar.

Especificação completa: `A9.txt` (na pasta pai deste repo). Princípio
inegociável: **zero dependência de LLM no core** — login, checkout,
pagamento, webhook e liberação de acesso são 100% determinísticos.

> Este repo pivotou em 2026-08-28 de uma plataforma de manga/webnovel/anime
> (com plugins de terceiros) pra este produto. O código antigo continua
> preservado, intacto, na branch `legacy-hydra`.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS + Prisma + PostgreSQL +
Mercado Pago + Cloudflare R2 (S3-compatible) + Docker. Sem
microserviços/Kubernetes/Redis/filas — tudo roda numa VPS pequena.

## Decisões de arquitetura registradas (Fase 1)

- **Sessão:** JWT assinado (HS256, `AUTH_SECRET`) em cookie `httpOnly`,
  `sameSite=lax`, 30 dias. Sem tabela `Session` no banco — a validação é
  por assinatura/expiração, o que evita depender de um store extra
  (Redis) só pra isso, mantendo a arquitetura "uma VPS pequena". Ver
  `src/lib/auth/session.ts`.
- **Proteção de rotas:** `src/proxy.ts` (arquivo `proxy.ts`, não
  `middleware.ts` — renomeado no Next.js 16) faz a checagem rápida de
  assinatura do JWT pra `/dashboard` e `/admin`. A checagem completa
  (usuário ainda `active`, role atual no banco) acontece em
  `requireUser`/`requireAdmin` (`src/lib/auth/guards.ts`), chamados nos
  layouts de cada área — defesa em profundidade, não confia só no proxy.
- **Senha:** `bcryptjs` (puro JS, sem binário nativo) em vez de `bcrypt` —
  este repo já teve problema de build com dependências nativas em mount
  NTFS/FUSE no ambiente de desenvolvimento local; `bcryptjs` evita isso.
- **IDs:** `cuid()` em vez de auto-incremento, pra não vazar contagem de
  usuários/vendas por IDs sequenciais em URLs.
- **Branding:** logo Oni (`public/brand/oni-logo.png`) reaproveitada do
  produto anterior, a pedido do Matheus.

## Rodando localmente

```bash
cp .env.example .env
# preencher DATABASE_URL, AUTH_SECRET (openssl rand -base64 32), etc.

docker compose up -d postgres   # ou um Postgres local na porta 5432
npm install
npm run prisma:migrate          # cria as tabelas
npm run create-admin            # cria o primeiro usuário ADMIN
npm run dev
```

## Deploy (Docker)

```bash
docker compose up -d --build
```

`Dockerfile` usa build standalone do Next.js (`output: "standalone"` em
`next.config.ts`) — imagem final não carrega `node_modules` inteiro.

## Backup

PostgreSQL: `pg_dump` agendado (ver documentação de deploy quando a Fase 8
for concluída). Arquivos de conteúdo ficam no storage R2/S3, fora do
banco — backup é responsabilidade da configuração do bucket (versionamento
do R2/S3), não deste repo.

## Status do roadmap

Ver seção 40 do `A9.txt` pra a ordem completa de fases. Estado atual:
**Fase 1 (Fundação) em andamento** — projeto Next.js, schema Prisma,
autenticação (lib + proxy), Docker e `.env.example` criados. Register/
login/dashboard (Fase 2) ainda não implementados.
