
# OmniMedia — Fase 4: Refinamento & Extensões Reais (Patches #21–#25)

---

## 🔲 PATCH #21 — Bugfixes & Polish Geral
**Objetivo:** Corrigir todos os bugs encontrados nos testes + melhorias de UX imediatas.

### Bugs a corrigir
- [ ] OmniCoins não atualizam em tempo real (requer relogin) → usar polling ou websocket simples
- [ ] Posts somem do feed após relogin → bug no listPosts (requesterId undefined)
- [ ] Logo não aparece na Navbar → caminho errado após build
- [ ] Notificação de coins ao ganhar → toast imediato no momento da ação

### Melhorias de UX
- [ ] Skeleton mais suave nas páginas de carregamento
- [ ] Scroll para o topo ao trocar de aba
- [ ] Toast de boas-vindas melhorado após cadastro (com OmniCoins iniciais)

---

## 🔲 PATCH #22 — Comunidade estilo Twitter
**Objetivo:** Reformular a aba de Comunidade para ter a mesma fluidez do Twitter/X.

### Entregáveis planejados
- Feed infinito com scroll (sem paginação explícita)
- Post com imagem, menção (@usuario) e hashtag (#)
- Thread de comentários inline (expandir/recolher direto no feed sem modal)
- Sistema de notificações: painel lateral com alertas de reações, comentários e menções
- Badge de notificação não lida na sidebar
- Contador de OmniCoins animado ao ganhar (ex: +2 🪙 flutuando)
- Explorar trending (posts com mais reações nas últimas 24h)
- Perfis clicáveis no feed (hover card com bio e stats)

---

## 🔲 PATCH #23 — Plugin Real & Repositório da Comunidade
**Objetivo:** Criar um plugin funcional real apontando para uma fonte pública legítima
e publicar o repositório oficial da comunidade no GitHub.

### Entregáveis planejados
**Plugin WebReader (fontes abertas):**
- Mangás de domínio público via MangaDex API (obras sem licença ativa)
- E-books via Project Gutenberg e Standard Ebooks
- Plugin validado com o PLUGIN_SPEC.md

**Repositório público no GitHub:**
- `github.com/omnimedia-community/plugins`
- `index.json` com os plugins aprovados
- URL real para adicionar no app

**No app:**
- Repositório oficial pré-configurado aponta para o GitHub real
- Testa o fluxo completo: adicionar repo → instalar plugin → ver conteúdo real

---

## 🔲 PATCH #24 — Deploy na Oracle Free Tier
**Objetivo:** Colocar o OmniMedia em produção na Oracle Free Tier + Cloudflare.

### Entregáveis planejados
- Script de setup da VPS Oracle (Ubuntu 22.04 ARM): Nginx, PM2, PostgreSQL, Node
- Configuração do Nginx como reverse proxy (api.dominio.com → Node :3001)
- Build do frontend para produção (`npm run build`) + deploy no Cloudflare Pages
- Configuração de SSL via Certbot (Let's Encrypt) para o backend
- Cloudflare: DNS, SSL/TLS Full Strict, cache rules para assets estáticos
- GitHub Actions: deploy automático ao fazer push na branch main
- Variáveis de ambiente de produção documentadas
- Abertura das portas corretas na Oracle Security List (80, 443)

---

## 🔲 PATCH #25 — Ranking, Níveis e Gamificação
**Objetivo:** Sistema de XP e níveis baseado em atividade para engajar usuários.

### Entregáveis planejados
- Tabela `user_xp` com histórico de ganhos de experiência
- Funções de nível: XP → nível atual + progresso para o próximo
- Página de Ranking global (top leitores, top contribuidores da comunidade)
- Badges automáticas por conquistas (10 títulos lidos, 50 capítulos, etc.)
- Barra de XP no perfil com animação de progresso
- OmniCoins bônus ao subir de nível
- Sidebar: aba "Níveis" ativa (estava como "em breve")
