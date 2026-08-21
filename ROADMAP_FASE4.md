
# OmniMedia — Fase 4: Refinamento & Extensões Reais (Patches #21–#25)

> Atualizado em 2026-08-21: este arquivo estava desatualizado — os patches
> #21–#30 já tinham sido implementados no código (commit `02d860f` "OmniMedia
> v5.0 - Patch #29" e seguintes), só nunca foram marcados aqui. Auditoria
> feita nesta sessão confirmou cada item contra o código real antes de
> marcar como concluído.

---

## ✅ PATCH #21 — Bugfixes & Polish Geral
**Objetivo:** Corrigir todos os bugs encontrados nos testes + melhorias de UX imediatas.
**Status:** Concluído (confirmado 2026-08-21)

### Bugs corrigidos
- [x] OmniCoins não atualizavam em tempo real → `OmniCoinsBalance.jsx` tem evento
      global `omnimedia:coins-updated` + polling leve 30s + animação ao ganhar.
- [x] Posts sumiam do feed após relogin (`requesterId` undefined) → já corrigido
      em `Community.js`/`community.js`, mas **durante a auditoria desta sessão
      foi encontrado um bug novo e crítico**: `community.js` e `library.js`
      tinham um bloco de import corrompido (fragmento duplicado colado sem o
      `import {` de abertura) que gerava `SyntaxError` e impedia o
      `node server.js` inteiro de subir. Corrigido — ver commit
      `fix: remove blocos de import corrompidos em community.js e library.js`.
- [x] Logo não aparecia na Navbar → `oni-logo.png` existe em
      `frontend/public/assets/logo/` e o caminho em `Navbar.jsx` está correto.
- [x] Notificação de coins ao ganhar → toast imediato implementado.

### Melhorias de UX
- [x] Skeleton mais suave — presente nas páginas principais.
- [x] Scroll para o topo ao trocar de aba — `AppContent.jsx:39`.
- [x] Toast de boas-vindas com OmniCoins iniciais — `useAuth.js:109`.

---

## ✅ PATCH #22 — Comunidade estilo Twitter
**Objetivo:** Reformular a aba de Comunidade para ter a mesma fluidez do Twitter/X.
**Status:** Concluído (confirmado 2026-08-21)

### Entregáveis confirmados
- [x] Feed infinito com scroll (`IntersectionObserver` em `CommunityPage.jsx`)
- [x] Post com imagem, menção (@usuário) e hashtag (#) — composer + parsing
- [x] Thread de comentários inline
- [x] Painel de notificações (`NotificationPanel.jsx`) com reações/comentários/menções
- [x] Badge de notificação não lida
- [x] Explorar trending (`GET /community/trending`, aba dedicada)
- [x] Perfis clicáveis / hover card

---

## ✅ PATCH #23 — Plugin Real & Repositório da Comunidade
**Objetivo:** Criar um plugin funcional real apontando para uma fonte pública legítima
e publicar o repositório oficial da comunidade no GitHub.
**Status:** Concluído — só a parte de fontes abertas (confirmado 2026-08-21)

### Entregáveis confirmados
- [x] `frontend/public/plugins/mangadex-reader.js` — API oficial da MangaDex
- [x] `frontend/public/plugins/gutenberg-reader.js` — Project Gutenberg (domínio público)
- [x] Repositório oficial publicado: `github.com/matheuscoopscel-max/que1ss0m3uf1c4lm4ab`
      (`frontend/public/community-repo/index.json`), referenciado por `store.js`

### Fora do escopo do Claude Code neste projeto
- `animesonline-reader.js` e `nhentaibr-reader.js` fazem scraping de sites de
  terceiros sem API oficial (`animesonlinecc.to`, `nhentaibr.com`) — decisão
  registrada: esses dois plugins específicos ficam por conta do Matheus,
  fora do trabalho do Claude Code neste projeto. Ver nota `PROJ-01` no RAG do
  Vault (`Omni Media-Vault/_rag/`).
- A partir de 2026-08-21, ativar QUALQUER plugin do catálogo (incluindo esses
  dois) pra todos os usuários é decisão exclusiva do admin pelo painel — ver
  Patch #31 abaixo.

---

## ✅ PATCH #24 — Deploy na Oracle Free Tier
**Objetivo:** Colocar o OmniMedia em produção na Oracle Free Tier + Cloudflare.
**Status:** Concluído e em produção (confirmado 2026-08-21)

### Entregáveis confirmados
- [x] `deploy/setup-vps.sh`, `deploy/deploy-backend.sh`, `deploy/nginx.conf`,
      `deploy/DEPLOY_GUIDE.md` existem no repo
- [x] Backend rodando de fato: VPS Oracle Cloud (IP `163.176.224.81`, São
      Paulo), processo PM2 `omnimedia-api` v2.0.0, nginx como proxy,
      `api.omnimediallc.com` → VPS direto (ver `Acesso-VPS-OmniMedia.md` no Vault)
- [x] Frontend na Cloudflare Pages, domínio `omnimediallc.com`
- [x] `.github/workflows/deploy.yml` — deploy automático via rsync+SSH no push em main

---

## ✅ PATCH #25 — Ranking, Níveis e Gamificação
**Objetivo:** Sistema de XP e níveis baseado em atividade para engajar usuários.
**Status:** Concluído (confirmado 2026-08-21)

### Entregáveis confirmados
- [x] `backend/migrations/011_create_ranking.sql`, `backend/src/models/Ranking.js`,
      `backend/src/routes/ranking.js`
- [x] `frontend/src/pages/RankingPage.jsx`, `frontend/src/components/ui/XPBar.jsx`,
      `frontend/src/hooks/useXP.js`
- [x] `earnXP()` chamado em post/comentário (`community.js`) e progresso de
      capítulo/conclusão de obra (`library.js`)

---

## Patches adicionais já implementados (não documentados até esta auditoria)

- **Patch #26–#29 (squash em `02d860f`):** LGPD compliance
  (`012_lgpd_compliance.sql`, `PrivacyConsentCheckbox.jsx`, `PrivacyPage.jsx`),
  sistema de notificações (`010_create_notifications.sql`, `Notifications.js`),
  suporte/tickets (`SupportPage.jsx`, `SupportTicketsAdmin`), 2FA e outros
  itens de segurança incrementais.
- **Patch #30:** plugins `animesonline-reader` e `nhentaibr-reader` + função
  scraper via Cloudflare Pages Function — fora do escopo do Claude Code
  neste projeto (ver nota acima e `PROJ-01` no Vault).

## ✅ PATCH #31 — Governança de plugins/repositórios exclusiva do admin
**Objetivo:** Sai o modelo "usuário instala/adiciona o que quiser", entra
curadoria só do admin — pedido do Matheus em 2026-08-21.
**Status:** Concluído (código), pendente rodar migration em produção

### Entregáveis
- `backend/migrations/013_create_content_sources.sql` — tabelas
  `repositories` e `plugin_activations`
- `backend/src/models/ContentSources.js`, `backend/src/routes/contentSources.js`
  (`GET /api/repositories`, `GET /api/plugins/active`, públicas)
- `backend/src/routes/admin.js` — `GET/POST/PATCH/DELETE /api/admin/repositories`,
  `GET/PATCH /api/admin/plugins`
- `frontend/src/components/admin/ContentSourcesManager.jsx` — novo painel
  admin (seção "Conteúdo")
- `frontend/src/hooks/usePluginBootstrap.js` — auto-sincroniza
  `installedPlugins` com a curadoria do admin, sem ação manual do usuário
- `frontend/src/pages/ExtensionsPage.jsx` e `PluginCard.jsx` — viraram
  somente leitura pro usuário final
- Removidos `AddRepositoryForm.jsx`/`RepositoryCard.jsx` (fluxo de usuário
  que não existe mais)

### Pendente
- [ ] Rodar `npm run migrate` no backend (local ou VPS) pra aplicar a
      migration 013 — sem isso as rotas novas retornam erro porque as
      tabelas não existem ainda.
- [ ] Verificar no navegador: boot sem login mostra só MangaDex + Gutenberg
      ativos; painel admin ativa/desativa o resto.
