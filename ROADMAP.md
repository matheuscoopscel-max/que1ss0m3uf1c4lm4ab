# OmniMedia Project — Roadmap de Desenvolvimento

> Arquitetura modular, open-source, multiplataforma.
> Stack: React + Vite + Tailwind CSS (frontend) · Node.js + Express (backend).
> Método: Patches cumulativos — cada patch é independentemente deployável.

---

## STATUS GERAL

```
[██████░░░░░░░░░░░░░░] Patch #1 — Core Boilerplate         ✓ CONCLUÍDO
[████████████░░░░░░░░] Patch #2 — Sistema de Plugins       ✓ CONCLUÍDO
[██████████████████░░] Patch #3 — Biblioteca & Navegação   ✓ CONCLUÍDO
[████████████████████] Patch #4 — Leitor de Imagens        ✓ CONCLUÍDO
[████████████████████] Patch #5 — Player de Vídeo          ✓ CONCLUÍDO
[████████████████████] Patch #6 — Backend PostgreSQL       ✓ CONCLUÍDO
[████████████████████] Patch #7 — Modo TV                   ✓ CONCLUÍDO
[████████████████████] Patch #8 — Empacotamento             ✓ CONCLUÍDO
[████████████████████] Patch #9 — Polish & Release          ✓ CONCLUÍDO

🎉 PROJETO COMPLETO — todos os patches entregues.
[████████████████████] Patch #10 — Assets & Visual Identity   ✓ CONCLUÍDO
```

---

## ✅ PATCH #1 — Core Boilerplate & Indexador de Plugins
**Status:** Concluído  
**Objetivo:** Estrutura base, API de catálogo, gerenciamento de estado, UI inicial.

### Entregáveis
- `backend/server.js` — API Express com catálogo mock (geral + restrito)
  - `GET /api/plugins` — lista plugins com filtros (categoria, busca, conteúdo restrito)
  - `GET /api/plugins/:slug` — detalhes de plugin
  - `GET /api/health` — healthcheck
- `frontend/src/lib/store.js` — Zustand store global
  - Plugins instalados (persistidos no localStorage)
  - Flag `restrictedContentEnabled` (padrão: `false`)
  - Estado do catálogo (idle/loading/success/error)
  - Filtros de busca e categoria
- `frontend/src/AppContent.jsx` — layout raiz + roteamento por abas
- `frontend/src/pages/LibraryPage.jsx` — biblioteca com empty state
- `frontend/src/pages/ExtensionsPage.jsx` — catálogo com busca, filtro e toggle +18
- `frontend/src/pages/SettingsPage.jsx` — configurações (modo de leitura, TV mode, conteúdo)
- `frontend/src/components/ui/Navbar.jsx` — barra de navegação responsiva
- `frontend/src/components/extensions/PluginCard.jsx` — card de plugin com instalar/remover
- Tailwind config com paleta `om-*` personalizada + fontes Syne/DM Sans

---

## ✅ PATCH #2 — Sistema de Plugins (Sandbox + Interface Padrão)
**Status:** Concluído  
**Objetivo:** Carregar e executar plugins JS isolados no cliente.

### Entregáveis
- `frontend/src/lib/pluginLoader.js` — Loader sandboxed via Blob URL dinâmico (fetch → Blob → import())
- `frontend/src/lib/pluginRegistry.js` — Registry em memória (`Map<slug, PluginInstance>`)
- `frontend/src/types/plugin.js` — Tipos JSDoc: `CatalogItem`, `MediaDetails`, `StreamUrl`, `PluginInstance`
- `frontend/src/hooks/usePlugin.js` — Hook com estado granular por operação (search/getDetails/getPagesOrStream)
- `frontend/src/hooks/usePluginBootstrap.js` — Carrega todos os plugins instalados no boot do app
- `frontend/src/components/ui/Toast.jsx` — Sistema de notificações toast sem dependências
- `frontend/src/components/extensions/PluginStatusBadge.jsx` — Badge ativo/carregando/erro/inativo
- `frontend/public/plugins/webreader-universal.js` — Plugin mock image-series (5 títulos, 12 capítulos, 18 páginas)
- `frontend/public/plugins/streamhub-hls.js` — Plugin mock video-stream (3 obras, HLS real + MP4)
- `PluginCard.jsx` atualizado — instalar agora faz load imediato + feedback toast
- `AppContent.jsx` atualizado — bootstrap banner + `ToastContainer`
- `store.js` atualizado — `pluginLoadStatus` map + `uninstallPlugin` faz unload do registry

### Critérios de conclusão
- [x] Plugin mock executa `search("test")` e retorna `CatalogItem[]`
- [x] Plugin com interface inválida é rejeitado com erro no console
- [x] Plugins instalados são re-carregados ao abrir o app
- [x] Toast de sucesso/erro ao instalar/remover plugin

---

## ✅ PATCH #3 — Biblioteca & Navegação de Conteúdo
**Status:** Concluído  
**Objetivo:** Grid dinâmico real via plugins, busca unificada, tela de detalhe com lista de capítulos.

### Entregáveis
- `frontend/src/hooks/useSearch.js` — busca unificada em todos os plugins carregados em paralelo, cancela resultados obsoletos via `searchIdRef`
- `frontend/src/hooks/useLibraryBrowse.js` — carrega catálogo completo de cada plugin progressivamente (atualiza UI à medida que chegam)
- `frontend/src/components/library/ContentCard.jsx` — card com capa, título, badges de tipo/plugin, hover scale
- `frontend/src/components/library/SearchBar.jsx` — input com debounce 350ms, spinner de loading, botão limpar
- `frontend/src/pages/ContentDetailPage.jsx` — tela de detalhe: capa, sinopse, autores, tags, lista de capítulos/episódios paginável, skeleton loader
- `frontend/src/pages/LibraryPage.jsx` — reescrita completa com roteamento interno (grid → detail → reader/player), filtro por tipo de mídia, empty state preservado
- `frontend/src/lib/store.js` — adicionado `libraryView`, `selectedItem`, `selectedChapter`, `openDetail`, `openChapter`, `backToGrid`, `backToDetail`

### Critérios de conclusão
- [x] Grid mostra itens de plugins instalados sem configuração extra
- [x] Busca retorna resultados em tempo real de todos os plugins
- [x] Navegação Library → Detail → Capítulo funciona sem reload
- [x] Filtro por tipo de mídia (quadrinhos/ebook/vídeo) funciona localmente
- [x] Skeleton loader enquanto conteúdo carrega

---

## ✅ PATCH #4 — Leitor de Imagens (Modo Cascata + Paginado)
**Status:** Concluído  
**Objetivo:** Leitor de quadrinhos/mangá funcional com dois modos, preload e navegação completa.

### Entregáveis
- `frontend/src/components/reader/ImageReader.jsx` — orquestrador principal: busca páginas via `plugin.getPagesOrStream()`, gerencia estado, fullscreen e integração com HUD/teclado
- `frontend/src/components/reader/CascadeMode.jsx` — scroll vertical contínuo com `IntersectionObserver` para rastrear página visível; scroll programático somente quando disparado externamente
- `frontend/src/components/reader/PagedMode.jsx` — uma página por vez; swipe horizontal (touch), double-tap para zoom 2×, clique nos terços laterais, `Ctrl+scroll` para zoom no desktop
- `frontend/src/components/reader/ReaderHUD.jsx` — HUD flutuante auto-ocultável (3s inatividade): título, progresso, barra clicável, botões de modo/fullscreen/fechar
- `frontend/src/hooks/useReaderKeyboard.js` — atalhos de teclado: `← →` `↑ ↓` `Space` `A/D` `PageUp/Down` (navegar), `M` (modo), `F` (fullscreen), `Esc` (fechar)
- `frontend/src/hooks/useImagePreloader.js` — pré-carrega 3 páginas à frente e 1 atrás via `new Image()`, limpa cache de páginas > 15 posições atrás
- `frontend/src/pages/LibraryPage.jsx` — atualizado: monta `<ImageReader>` no lugar do placeholder quando `libraryView === "reader"`

### Critérios de conclusão
- [x] Alterna entre cascata e paginado sem reload de páginas
- [x] Preload funciona e não quebra em imagens com CORS restritivo
- [x] Navegação por teclado + D-Pad funcional em ambos os modos
- [x] Swipe horizontal funciona no mobile (modo paginado)
- [x] HUD auto-oculta e reaparece com movimento

---

## ✅ PATCH #5 — Player de Vídeo (HLS + MP4 + Controles Customizados)
**Status:** Concluído  
**Objetivo:** Player HTML5 customizado com suporte a streams HLS `.m3u8` e MP4 direto, sem intermediários.

### Entregáveis
- `frontend/src/hooks/useVideoPlayer.js` — gerencia todo o estado do vídeo (play/pause/seek/volume/mute/buffered/fullscreen/qualities); integra `hls.js` via import dinâmico com fallback nativo para Safari; recuperação automática de erros de rede e mídia HLS
- `frontend/src/hooks/usePlayerKeyboard.js` — atalhos: `Space/K` play/pause · `←/J` -10s · `→/L` +10s · `↑↓` volume · `M` mute · `F` fullscreen · `Esc` fechar
- `frontend/src/components/player/PlayerControls.jsx` — HUD completo auto-ocultável: scrubber com buffer visual e thumb, skip ±10s, seletor de qualidade HLS dropdown, controle de volume com slider, fullscreen, botão fechar
- `frontend/src/components/player/VideoPlayer.jsx` — orquestrador: busca `StreamUrl` via `plugin.getPagesOrStream()`, instancia `useVideoPlayer`, renderiza como overlay `fixed inset-0`
- `frontend/src/pages/LibraryPage.jsx` — atualizado: monta `<VideoPlayer>` quando `libraryView === "player"`

### Critérios de conclusão
- [x] Stream HLS público reproduz sem erros (testado com mux.dev)
- [x] Fallback MP4 direto funciona
- [x] Controles desaparecem após 3s de inatividade, reaparecem com movimento
- [x] Seletor de qualidade lista os níveis do manifesto HLS
- [x] Teclado + D-Pad navegam todos os controles

---

## ✅ PATCH #6 — Backend PostgreSQL + API Completa + Docker
**Status:** Concluído

### Entregáveis
- `backend/src/db/pool.js` — pool pg com `query()` / `queryOne()` / `testConnection()`
- `backend/src/models/Plugin.js` — DAL: listPlugins, findBySlug, createSubmission, incrementInstallCount
- `backend/src/routes/plugins.js` — GET / · GET /:slug · POST /submit · POST /:slug/install
- `backend/src/services/pluginValidator.js` — validação de campos, slug único, HEAD request na scriptUrl
- `backend/src/middleware/rateLimiter.js` — apiLimiter (100/min) + submitLimiter (5/min)
- `backend/src/middleware/errorHandler.js` — handler centralizado
- `backend/migrations/001_create_extensions.sql` — schema, enums, índices, trigger updated_at, full-text index
- `backend/migrations/002_seed_extensions.sql` — seed idempotente com ON CONFLICT DO UPDATE
- `backend/scripts/migrate.js` — runner de migrations com tabela schema_migrations
- `backend/scripts/seed.js` — executa apenas o seed
- `backend/Dockerfile` — Node 22 Alpine; CMD: migrate + seed + server
- `docker-compose.yml` (raiz) — PostgreSQL 16 + API com healthchecks e volume persistente
- `backend/.env.example` — todas as variáveis documentadas
- `frontend/.../PluginCard.jsx` — POST /plugins/:slug/install fire-and-forget ao instalar

### Critérios de conclusão
- [x] `docker compose up` sobe API + banco funcionais
- [x] `/api/plugins` retorna dados do PostgreSQL
- [x] Submissão de plugin gera registro com status `pending`
- [x] Rate limiting configurável via .env
- [x] Migrations idempotentes

---

## ✅ PATCH #7 — Modo TV (D-Pad Navigation + 10-ft UI)
**Status:** Concluído

### Entregáveis
- `frontend/src/hooks/useTVNavigation.js` — navegação espacial: coleta elementos focáveis, calcula vizinho mais próximo por eixo primário + secundário ponderado, move foco programaticamente
- `frontend/src/hooks/useTVCursor.js` — oculta cursor em modo TV; reexibe 3s ao mover o mouse
- `frontend/src/components/ui/FocusRing.jsx` — anel de foco externo animado, posicionado via getBoundingClientRect + rAF, acompanha scroll/resize
- `frontend/src/components/ui/TVOverlay.jsx` — barra de dicas de navegação (aparece 5s ao ativar)
- `frontend/src/styles/globals.css` — bloco `.tv-mode`: font-size 110%, grid reduzido (3-4 colunas), botões maiores, outline nativo removido
- `AppContent.jsx` — integra useTVNavigation + useTVCursor + FocusRing + TVOverlay
- `LibraryPage.jsx` — classe `tv-grid` no grid para override via CSS
- `ContentCard.jsx` — classe `tv-card-title` no título para escala TV
- `SettingsPage.jsx` — painel de atalhos ativos quando tvMode=true

### Critérios de conclusão
- [x] Navegação completa do app sem mouse/toque
- [x] FocusRing visível e animado em todos os elementos interativos
- [x] Cursor oculto automaticamente em modo TV
- [x] Grid e fontes escalados para visualização a distância
- [x] Dicas de navegação exibidas ao ativar o modo

---

## ✅ PATCH #8 — Empacotamento Desktop & Mobile (Tauri + Capacitor)
**Status:** Concluído

### Entregáveis
- `frontend/src/lib/platform.js` — detecção runtime: `isTauri`, `isCapacitor`, `isTV` (user-agent + flag nativa), `getApiBaseUrl()` por plataforma
- `frontend/src-tauri/tauri.conf.json` — Tauri v2: janela 1280×800, CSP completa (connect-src, img-src, media-src, blob:, worker-src)
- `frontend/src-tauri/Cargo.toml` — dependências Rust: tauri v2, shell, dialog, fs
- `frontend/src-tauri/src/main.rs` + `lib.rs` + `build.rs` — ponto de entrada Rust mínimo
- `frontend/capacitor.config.ts` — Capacitor 6: appId, androidScheme https, SplashScreen escuro, StatusBar dark
- `frontend/android/app/src/main/AndroidManifest.xml` — suporte telefone + tablet + Android TV (LEANBACK_LAUNCHER, touchscreen não obrigatório)
- `frontend/android/app/src/main/java/app/omnimedia/MainActivity.java` — detecta Android TV via UiModeManager e injeta `window.__OMNIMEDIA_TV__`
- `frontend/android/.../network_security_config.xml` — HTTPS obrigatório, HTTP só em localhost
- `frontend/android/.../styles.xml` — tema dark `#0a0a0f` nativo
- `frontend/package.json` — scripts: `build:desktop`, `dev:desktop`, `build:android`, `build:tv`, `dev:android`, `cap:sync`
- `frontend/vite.config.js` — `strictPort`, `host: true`, `clearScreen: false` para Tauri; code splitting em chunks para WebViews
- `frontend/.env.example` — documenta `VITE_API_URL_NATIVE`
- `frontend/src/lib/store.js` — usa `getApiBaseUrl()` ao invés de env var direta
- `BUILDING.md` — guia completo de build por plataforma com pré-requisitos

### Critérios de conclusão
- [x] Build Desktop: `npm run build:desktop` gera .exe/.AppImage/.dmg
- [x] Build Android: `npm run build:android` gera APK para telefone e TV
- [x] Android TV: detecta automaticamente e ativa Modo TV
- [x] CSP configurada para permitir plugins (blob:, https:) em todas as plataformas
- [x] API URL configurável via `VITE_API_URL_NATIVE` para builds nativas

---

## ✅ PATCH #9 — Polish, Performance & Segurança
**Status:** Concluído — Release público

### Entregáveis
- `frontend/src/lib/pluginSandbox.js` — sandbox via `<iframe sandbox="allow-scripts allow-same-origin">` + protocolo RPC assíncrono por `postMessage`; timeout de 15s por chamada
- `frontend/src/lib/pluginLoader.js` — atualizado: tenta sandbox iframe primeiro; fallback para Blob URL (Patch #2) em Tauri; proxy PluginInstance que rota para `callSandboxMethod()`
- `frontend/public/sw.js` — Service Worker com 5 caches: Shell (Stale-While-Revalidate), Fonts (Cache First 1 ano), Plugins (Cache First 7 dias), API (Network First), Images (Cache First 100 entradas)
- `frontend/src/hooks/useServiceWorker.js` — registra o SW; exibe toast quando nova versão está disponível
- `frontend/src/main.jsx` — lazy loading de AppContent via `React.lazy`; lê `?tab=` da URL para PWA shortcuts
- `frontend/index.html` — SEO completo: Open Graph, PWA meta tags, `<link rel="manifest">`
- `frontend/public/manifest.json` — Web App Manifest com shortcuts para Biblioteca e Extensões
- `frontend/src/AppContent.jsx` — integra `useServiceWorker()`
- `.github/workflows/ci.yml` — CI: build frontend + syntax check backend + smoke test Docker
- `.github/workflows/deploy.yml` — deploy via rsync+SSH; migrate + pm2 restart no VPS
- `PLUGIN_SPEC.md` — especificação completa: tipos, exemplos, regras de conduta, endpoint de submissão
- `CONTRIBUTING.md` — guia para core e plugins: setup, estrutura, branches, PR, código de conduta
- `.gitignore` — monorepo completo

### Critérios de conclusão
- [x] Plugins executam em iframe sandbox isolado
- [x] App funciona offline (SW cacheou shell + fontes)
- [x] Lazy loading reduz bundle inicial
- [x] SEO e PWA meta tags completos
- [x] CI/CD configurado para push em main
- [x] Documentação completa para contribuidores e desenvolvedores de plugins

---

## ✅ PATCH #10 — Assets & Visual Identity
**Status:** Concluído

### Entregáveis
- `frontend/public/assets/logo/oni-logo.jpg` — logotipo Oni Mask (imagem fornecida pelo projeto)
- `frontend/public/assets/icons/` — 312 ícones Streamline Ultimate + 28 aliases com nomes semânticos
- `frontend/src/lib/icons.js` — registro central: `Icons`, `Logo`, componente `<Icon name="..." size={n} />`
- `frontend/src/components/ui/Navbar.jsx` — logo oni mask + ícones Streamline nas tabs (sem SVGs inline)
- `frontend/src/pages/LibraryPage.jsx` — empty state com ícone `library` real
- `frontend/src/pages/ExtensionsPage.jsx` — busca, filtro, lock/unlock, warning via ícones reais
- `frontend/src/pages/ContentDetailPage.jsx` — placeholder de capa, botão assistir, erro via ícones
- `frontend/src/components/extensions/PluginCard.jsx` — ícones de tipo de mídia; usa `iconUrl` do plugin quando disponível
- `frontend/src/components/library/ContentCard.jsx` — placeholder e badge de tipo com ícones reais
- `frontend/src/components/library/SearchBar.jsx` — ícone de busca real
- `frontend/src/components/ui/TVOverlay.jsx` — ícone de monitor real

### Critérios de conclusão
- [x] Nenhum emoji hardcoded nos componentes principais
- [x] Logo oni mask exibida na Navbar
- [x] Todos os ícones roteiam pelo registro central `Icons`
- [x] PluginCard usa `iconUrl` do plugin quando disponível

---


---

## FASE 2 — Plataforma Social & Experiência (Patches #11–#17)

> Inspiração: Nexus Toons — hero banner, sidebar, sistema de conta, perfis, comunidade e loja.
> Cada patch é cumulativo e independentemente deployável.

---

## ✅ PATCH #11 — Modelo de Repositórios Externos (Estilo Hydra)
**Objetivo:** Remover o catálogo central do servidor e adotar repositórios hospedados pela comunidade.
**Status:** Concluído

### Entregáveis
- `frontend/src/lib/repositoryLoader.js` — fetch + validação de index.json externo com timeout 10s
- `frontend/src/components/repository/RepositoryCard.jsx` — card de repositório com status, refresh e remover
- `frontend/src/components/repository/AddRepositoryForm.jsx` — input de URL com validação e feedback
- `frontend/src/pages/ExtensionsPage.jsx` — reescrita com sub-abas Plugins | Repositórios
- `frontend/src/lib/store.js` — `repositories[]` substitui `catalog`; `addRepository`, `removeRepository`, `refreshAllRepositories`, `getAllRepositoryPlugins`
- `frontend/public/community-repo/index.json` — repositório oficial da comunidade servido localmente em dev
- `REPOSITORY_SPEC.md` — especificação pública do formato index.json
- `backend/server.js` — simplificado: remove catálogo de plugins, mantém só healthcheck
- `hooks/usePluginBootstrap.js` — atualizado para disparar refresh dos repositórios no boot

### Critérios de conclusão
- [x] Usuário cola URL de repositório e vê lista de plugins disponíveis
- [x] Instalar plugin de repositório externo funciona igual ao fluxo anterior
- [x] Backend não armazena mais referências a plugins de conteúdo
- [x] Filtro por repositório na aba de plugins
- [x] Repositório padrão da comunidade pré-configurado

---

## ✅ PATCH #12 — Sistema de Conta (Auth + Sincronização de Extensões)
**Objetivo:** Login/cadastro opcional. Quem tem conta sincroniza extensões instaladas entre dispositivos.

### Entregáveis planejados
**Backend:**
- Migration: tabelas `users`, `sessions`, `user_installations`
- `POST /api/auth/register` — cadastro com email + senha (bcrypt)
- `POST /api/auth/login` — retorna JWT (access token 15min + refresh token 7 dias)
- `POST /api/auth/refresh` — renova access token via refresh token httpOnly cookie
- `POST /api/auth/logout` — invalida refresh token
- `GET/POST/DELETE /api/me/installations` — sincroniza plugins instalados

**Frontend:**
- `src/pages/AuthPage.jsx` — tela de login/cadastro com toggle
- `src/hooks/useAuth.js` — gerencia JWT, refresh automático, estado autenticado
- `src/lib/api.js` — cliente HTTP com interceptor de token
- `store.js` — adiciona `user`, `isAuthenticated`, merge local ↔ servidor ao fazer login
- Navbar — avatar/nome do usuário logado ou botão "Entrar"
- Extensões instaladas sincronizam ao logar (merge: local + servidor, sem duplicatas)

**Status:** Concluído

### Entregáveis
- `backend/migrations/003_create_users.sql` — tabelas users, sessions, user_installations + função cleanup_expired_sessions
- `backend/src/services/authService.js` — bcrypt, JWT access (15m) + refresh token opaco (7d)
- `backend/src/models/User.js` — DAL: createUser, findUserByEmail, checkUniqueness, createSession, findSession, upsertInstallation, getUserInstallations
- `backend/src/routes/auth.js` — register, login, refresh, logout, logout-all (rate limiter 10/15min)
- `backend/src/routes/me.js` — GET /me, GET/POST/DELETE /me/installations, POST /me/installations/sync
- `backend/src/middleware/authenticate.js` — authenticate (obrigatório) + authenticateOptional
- `frontend/src/lib/api.js` — cliente HTTP com injeção automática de Bearer token e retry de refresh em 401
- `frontend/src/hooks/useAuth.js` — login, register, logout, refreshSession, syncInstallations
- `frontend/src/components/auth/AuthModal.jsx` — modal login/cadastro com toggle de abas e validação
- `frontend/src/components/ui/Navbar.jsx` — botões Entrar/Criar conta + dropdown de usuário logado
- `frontend/src/lib/store.js` — adicionado user + setUser (persistido)
- `frontend/src/AppContent.jsx` — restaura sessão via httpOnly cookie ao abrir o app
- `frontend/src/components/extensions/PluginCard.jsx` — instalar sincroniza com a conta quando logado

### Critérios de conclusão
- [x] Cadastro e login funcionam
- [x] Plugins instalados antes do login são migrados para a conta
- [x] Ao logar em outro dispositivo, extensões aparecem sincronizadas
- [x] Logout limpa o estado local
- [x] Sessão restaurada automaticamente ao reabrir o app

---

## ✅ PATCH #13 — Biblioteca Pessoal (Salvos, Lendo, Favoritos, Histórico)
**Objetivo:** Sistema completo de tracking de leitura/assistência por conta de usuário.

### Entregáveis planejados
**Backend:**
- Migration: tabela `user_library` — `{ user_id, plugin_slug, item_id, status, progress, updated_at }`
- Enum `status`: `reading` | `watching` | `completed` | `saved` | `dropped` | `favorite`
- `GET/POST/PATCH/DELETE /api/me/library` — CRUD da biblioteca pessoal
- `GET /api/me/library?status=reading` — filtro por status
- `PATCH /api/me/library/:itemId/progress` — atualiza capítulo/episódio atual

**Frontend:**
- `src/pages/LibraryPage.jsx` — abas: Lendo · Assistindo · Salvos · Favoritos · Concluídos · Largados
- `src/components/library/LibraryStatusButton.jsx` — botão flutuante no card: adicionar/mudar status
- `src/hooks/useLibraryStatus.js` — lê e atualiza status de um item
- Progresso salvo: ao fechar o leitor/player, salva o capítulo atual automaticamente
- Badge de progresso nos cards ("Cap. 12 / 48")
- Usuário sem conta: funciona igual mas salva no localStorage

**Status:** Concluído

### Entregáveis
- `backend/migrations/004_create_user_library.sql` — tabela user_library com enum library_status, índices e trigger updated_at
- `backend/src/models/Library.js` — DAL: listLibrary, findLibraryItem, upsertLibraryItem, updateProgress, toggleFavorite, removeLibraryItem, getStatusCounts
- `backend/src/routes/library.js` — GET/POST/PATCH/DELETE /api/me/library (todas autenticadas)
- `backend/server.js` — registra libraryRouter em /api/me/library
- `frontend/src/hooks/useLibraryStatus.js` — lê/escreve status local + sincroniza com servidor quando logado
- `frontend/src/components/library/LibraryStatusButton.jsx` — botão flutuante no card com dropdown de opções
- `frontend/src/components/library/ContentCard.jsx` — barra de progresso, badge de favorito, LibraryStatusButton no hover
- `frontend/src/pages/LibraryPage.jsx` — reescrita com abas: Descobrir · Lendo · Assistindo · Salvos · Favoritos · Concluídos · Largados
- `frontend/src/lib/store.js` — localLibrary Map + setLocalLibraryItem + removeLocalLibraryItem (persistido)

### Critérios de conclusão
- [x] Marcar item como "Lendo" aparece na aba correta
- [x] Barra de progresso aparece no card quando há progresso salvo
- [x] Favorito funciona independente do status
- [x] Funciona sem conta (localStorage) e sincroniza quando logado

---

## ✅ PATCH #14 — Sistema de Perfis
**Objetivo:** Perfil público por usuário com avatar, bio, estatísticas e atividade recente.

### Entregáveis planejados
**Backend:**
- Migration: tabela `profiles` — `{ user_id, username, bio, avatar_url, banner_url, is_public }`
- `GET /api/profiles/:username` — perfil público
- `PATCH /api/me/profile` — edita próprio perfil
- `POST /api/me/avatar` — upload de avatar (armazena no filesystem ou S3)
- `GET /api/me/stats` — estatísticas: total lido, capítulos, horas assistidas

**Frontend:**
- `src/pages/ProfilePage.jsx` — perfil com banner, avatar, bio, stats e atividade recente
- `src/components/profile/AvatarUpload.jsx` — crop e upload de avatar
- `src/components/profile/StatsGrid.jsx` — cards de estatísticas
- `src/components/profile/ActivityFeed.jsx` — feed de "X começou a ler Y"
- Cosméticos: frames de avatar (preparação para Patch #17)
- Settings → link para editar perfil

**Status:** Concluído

### Entregáveis
- `backend/migrations/005_create_profiles.sql` — tabela profiles + VIEW user_stats (calculada em tempo real via JOIN) + trigger
- `backend/src/models/Profile.js` — DAL: findProfileByUsername/UserId, updateProfile, getUserStats, getRecentActivity, createProfile
- `backend/src/services/uploadService.js` — multer + sharp: avatar 256×256 WebP, banner 1200×300 WebP
- `backend/src/routes/profiles.js` — GET /profiles/:username (público) · GET/PATCH /me/profile · POST /me/avatar + /me/banner · GET /me/stats · GET /me/activity
- `frontend/src/hooks/useProfile.js` — useMyProfile (fetch + update + upload) + usePublicProfile
- `frontend/src/components/profile/AvatarUpload.jsx` — avatar clicável com preview imediato e overlay de loading
- `frontend/src/components/profile/StatsGrid.jsx` — 6 cards de estatísticas
- `frontend/src/components/profile/ActivityFeed.jsx` — feed de atividade recente com tempo relativo
- `frontend/src/pages/ProfilePage.jsx` — banner clicável, avatar, bio, formulário inline, abas Stats/Atividade
- `frontend/src/components/ui/Navbar.jsx` — dropdown do usuário com link "Meu Perfil"
- `frontend/src/AppContent.jsx` — rota "profile" registrada

### Critérios de conclusão
- [x] Perfil público acessível por /api/profiles/:username
- [x] Upload de avatar redimensiona para 256×256 WebP
- [x] Upload de banner redimensiona para 1200×300 WebP
- [x] Stats calculadas via VIEW em tempo real
- [x] Atividade recente exibe os últimos 20 itens
- [x] Formulário de edição inline com toggle de perfil público

---

## ✅ PATCH #15 — UI/UX Premium (Hero Banner + Sidebar + Carrosséis + Animações)
**Objetivo:** Visual de alto nível — hero banner rotativo, animações de entrada, sidebar, cards com hover rico.

### Entregáveis planejados
**Frontend:**
- `src/components/ui/HeroBanner.jsx` — banner hero full-width com título, capa, rating, botões "Ler Agora" e "Detalhes", autoplay entre destaques com fade
- `src/components/ui/Sidebar.jsx` — navegação lateral colapsável (desktop): Início, Biblioteca, Ranking, Níveis, Comunidade, Grupos, Loja
- Layout principal refatorado: sidebar fixa no desktop, bottom nav no mobile
- `src/components/library/ContentCardV2.jsx` — card com hover: zoom na capa, overlay com synopsis, rating com estrelas, badge de status de leitura
- Animações com CSS transitions: fade-in escalonado no grid, skeleton mais suave, transição entre páginas
- `src/components/ui/RatingStars.jsx` — avaliação com estrelas
- `src/components/ui/ScrollCarousel.jsx` — carrossel horizontal com snap (Destaques, Populares, Lançamentos)
- Paleta de cores expandida: suporte a temas (dark padrão + opção light)

**Status:** Concluído

### Entregáveis
- `tailwind.config.js` — novas animações: slide-up/left/right, scale-in, hero-fade, stagger-1/2/3
- `components/ui/HeroBanner.jsx` — hero full-width rotativo: autoplay 7s, fade+scale, capa mini, badge, sinopse, botões Ler/Detalhes, indicadores de slide
- `components/ui/ScrollCarousel.jsx` + `CarouselItem` — carrossel snap com botões de seta no hover e fade lateral
- `components/ui/Sidebar.jsx` — sidebar colapsável (desktop, lg+) com seções NAVEGAR/SOCIAL/INFO + badges "em breve"
- `components/ui/BottomNav` (no mesmo arquivo) — bottom nav 4 itens para mobile
- `components/ui/RatingStars.jsx` — avaliação 0–5 com suporte a meia estrela SVG
- `components/ui/PageTransition.jsx` — fade+translateY entre trocas de página
- `components/library/ContentCardV2.jsx` — card premium: hover overlay com sinopse, zoom na capa, status badge, barra de progresso, variant compact/wide
- `AppContent.jsx` — layout refatorado: Sidebar + offset dinâmico + BottomNav + PageTransition
- `pages/LibraryPage.jsx` — DiscoverTab com HeroBanner + 3 carrosséis por tipo + grid completo
- `styles/globals.css` — scrollbar-hide + stagger-grid animations

### Critérios de conclusão
- [x] Hero banner rotativo com 3+ títulos em destaque
- [x] Sidebar funcional no desktop, bottom nav no mobile
- [x] ContentCardV2 com hover overlay de sinopse
- [x] Carrosséis horizontais com scroll snap e botões de navegação
- [x] Transição suave entre páginas

---

## ✅ PATCH #16 — Busca Avançada & Categorias
**Objetivo:** Sistema de descoberta de conteúdo por gênero, tipo, status e popularidade.

### Entregáveis planejados
**Frontend:**
- `src/pages/SearchPage.jsx` — página de busca dedicada com filtros avançados
- `src/pages/CategoryPage.jsx` — browse por categoria/gênero (Ação, Romance, Fantasia, etc.)
- `src/components/search/FilterPanel.jsx` — painel de filtros: tipo de mídia, gênero, status (em andamento/concluído), ordenação (popular, recente, avaliação)
- `src/components/search/SearchSuggestions.jsx` — autocomplete com debounce mostrando títulos e autores
- Busca unificada across plugins com agrupamento por plugin de origem
- URL persistente: `/search?q=naruto&genre=acao&type=manga`
- `src/hooks/useSearchFilters.js` — gerencia filtros na URL via URLSearchParams

**Backend:**
- `GET /api/categories` — lista categorias/gêneros disponíveis (agregado dos plugins)
- `GET /api/trending` — itens em trending (baseado em install_count e atividade recente)

**Status:** Concluído

### Entregáveis
- `frontend/src/hooks/useSearchFilters.js` — filtros sincronizados com URL via URLSearchParams (replace state, sem reload)
- `frontend/src/components/search/FilterPanel.jsx` — painel colapsável: tipo, gênero (16 opções), status, ordenação, plugin de origem; badge de contagem
- `frontend/src/components/search/SearchSuggestions.jsx` — autocomplete com debounce 250ms: busca nos plugins carregados, navegação com setas, selecionar abre detalhe
- `frontend/src/pages/SearchPage.jsx` — busca full-text com filtros, agrupamento por plugin toggle, sugestões de gêneros, grid stagger
- `frontend/src/pages/CategoryPage.jsx` — grid de 16 gêneros com emoji; seleciona → grid paginado (PAGE_SIZE=24) + "Carregar mais"
- `frontend/src/AppContent.jsx` — rotas `search` e `categories` registradas
- `frontend/src/components/ui/Sidebar.jsx` — Busca e Categorias adicionados à navegação

### Critérios de conclusão
- [x] Filtro por gênero filtra localmente os resultados dos plugins
- [x] URL reflete query + filtros ativos (compartilhável)
- [x] Autocomplete mostra sugestões em <250ms com debounce
- [x] Página de categoria com grid paginado e "Carregar mais"
- [x] Resultados agrupados por plugin de origem

---

## ✅ PATCH #17 — Comunidade, Grupos & Loja de Cosméticos
**Objetivo:** Camada social completa + monetização via cosméticos de perfil.

### Entregáveis planejados
**Backend:**
- Migration: tabelas `posts`, `comments`, `groups`, `group_members`, `items_shop`, `user_inventory`, `transactions`
- `GET/POST /api/community/posts` — feed de posts da comunidade
- `GET/POST /api/groups` — grupos de interesse (por gênero, obra, etc.)
- `GET /api/shop/items` — catálogo da loja (frames de avatar, banners, badges)
- `POST /api/shop/purchase` — compra com moeda virtual (OmniCoins)
- `GET /api/me/inventory` — itens do usuário
- Sistema de OmniCoins: ganhos por atividade (ler capítulos, fazer posts, etc.)

**Frontend:**
- `src/pages/CommunityPage.jsx` — feed de posts, comentários, likes
- `src/pages/GroupsPage.jsx` — listagem e páginas de grupos
- `src/pages/ShopPage.jsx` — loja com preview de cosméticos no perfil
- `src/components/community/PostCard.jsx` — post com imagem, texto, reações
- `src/components/community/CommentThread.jsx` — thread de comentários
- `src/components/shop/ItemCard.jsx` — card de item com preview e preço em OmniCoins
- `src/components/shop/OmniCoinsBalance.jsx` — saldo na navbar
- Integração com perfil: cosméticos comprados aparecem no avatar/banner

**Status:** Concluído 🎉 FASE 2 COMPLETA

### Entregáveis
**Backend:** `migrations/006_create_community.sql` (7 tabelas + 6 itens seed + função earn_omnicoins) · `models/Community.js` (posts+reactions+comments+groups) · `models/Shop.js` (shop+inventory+coins+transactions) · `routes/community.js` (posts, reações, comentários, grupos) · `routes/shop.js` (itens, compra, equipar, inventário, coins, transactions)
**Frontend:** `components/community/PostCard.jsx` (reações animadas com picker, referência a obra) · `components/shop/OmniCoinsBalance.jsx` (saldo na Navbar) · `components/shop/ItemCard.jsx` (preview CSS, comprar/equipar) · `pages/CommunityPage.jsx` (feed+composer+comentários modal+grupos) · `pages/ShopPage.jsx` (loja+inventário+histórico)
**Integrações:** Navbar com OmniCoinsBalance · Sidebar com Comunidade e Loja sem "em breve" · AppContent com rotas community e shop

### Critérios de conclusão
- [x] Postar e comentar na comunidade funciona com crédito de OmniCoins
- [x] Grupos podem ser criados e listados por gênero
- [x] Loja exibe itens com preview do cosmético aplicado
- [x] OmniCoins ganhos por atividade (post+5, comment+2)
- [x] Cosméticos equipados refletem no perfil (avatar_frame, badge_slug)


---

## FASE 3 — Monetização & Administração (Patches #18–#19)

---

## ✅ PATCH #18 — Painel Administrativo
**Objetivo:** Interface completa de administração com gerenciamento de usuários, conteúdo, loja e configuração de APIs externas via painel (sem mexer no .env).

### Entregáveis planejados
**Backend:**
- `migrations/007_create_admin.sql` — flag `is_admin` em users + tabela `app_settings` (chave-valor) + tabela `api_keys` (chave AES-criptografada) + grant automático para o primeiro usuário
- `src/services/cryptoService.js` — AES-256-GCM para criptografar/descriptografar API keys sensíveis
- `src/middleware/requireAdmin.js` — middleware que verifica `is_admin = true`
- `src/models/Settings.js` — DAL para app_settings e api_keys
- `src/routes/admin.js` — rotas /api/admin/* (todas protegidas):
  - GET /admin/stats — usuários, posts, transações, OmniCoins em circulação
  - GET/PATCH /admin/users — listar + banir/desbanir + promover admin
  - GET/DELETE /admin/posts — listar + remover posts da comunidade
  - GET/POST/PATCH/DELETE /admin/shop/items — gerenciar catálogo da loja
  - GET/POST /admin/settings — configurações gerais do app
  - GET/POST /admin/api-keys — ler (mascarado) e gravar API keys criptografadas

**Frontend:**
- `src/pages/AdminPage.jsx` — layout com sidebar de seções admin
- `src/components/admin/AdminDashboard.jsx` — cards de stats em tempo real
- `src/components/admin/UsersTable.jsx` — tabela de usuários com ações
- `src/components/admin/PostsModeration.jsx` — fila de moderação de posts
- `src/components/admin/ShopManager.jsx` — CRUD de itens da loja
- `src/components/admin/ApiKeysPanel.jsx` — formulário para configurar Stripe, SMTP, etc.
- `src/components/admin/AppSettings.jsx` — configurações gerais (nome do site, manutenção, etc.)
- Rota protegida: só admins veem o link "Admin" no dropdown da Navbar

**Status:** Concluído

### Entregáveis
**Backend:** `migrations/007_create_admin.sql` (is_admin + trigger primeiro usuário + app_settings + api_keys) · `services/cryptoService.js` (AES-256-GCM + maskSecret) · `middleware/requireAdmin.js` · `models/Settings.js` (getSetting, setSetting, bulkSet, listApiKeys, setApiKey, getApiKeyValue) · `routes/admin.js` (stats, users CRUD, posts moderação, shop CRUD, settings bulk, api-keys)
**Frontend:** `hooks/useAdmin.js` · `components/admin/AdminDashboard.jsx` (6 stat cards) · `components/admin/ApiKeysPanel.jsx` (grupos Stripe/SMTP, status configurado/pendente, input tipo password) · `components/admin/AppSettings.jsx` (toggle booleans, campos de texto) · `components/admin/AdminTables.jsx` (UsersTable + PostsModeration + ShopManager) · `pages/AdminPage.jsx` (sidebar + mobile pills + rota protegida) · Navbar: link "Painel Admin" no dropdown (só para admins)

### Critérios de conclusão
- [x] Primeiro usuário cadastrado é admin automaticamente (via trigger)
- [x] API keys criptografadas AES-256-GCM, nunca expostas pela API
- [x] Dashboard exibe stats em tempo real com refresh manual
- [x] Moderar posts oculta da comunidade
- [x] Gerenciar loja cria/ativa/oculta itens

---

## ✅ PATCH #19 — Integração Stripe (VIP + Compras Avulsas)
**Objetivo:** Monetização completa: assinatura VIP mensal (Stripe Subscriptions) + compras avulsas de OmniCoins e cosméticos (Stripe Payment Intents). Chaves lidas do banco (configuradas no Patch #18).

### Entregáveis planejados
**Backend:**
- `migrations/008_create_subscriptions.sql` — tabela `subscriptions` (status, stripe_subscription_id, current_period_end) + tabela `coin_packages` (pacotes de OmniCoins com preço)
- `src/services/stripeService.js` — wrapper do Stripe SDK que lê as chaves do banco (via Settings) em vez do .env
- `src/routes/stripe.js` — rotas de pagamento:
  - POST /api/stripe/create-subscription — cria Stripe Checkout Session para plano VIP
  - POST /api/stripe/create-payment — cria Payment Intent para compra avulsa (OmniCoins / cosmético)
  - POST /api/stripe/webhook — recebe eventos do Stripe (checkout.session.completed, customer.subscription.*)
  - GET /api/me/subscription — status da assinatura do usuário
  - POST /api/me/subscription/cancel — cancela assinatura
- Seed: 3 pacotes de OmniCoins (100, 500, 1200) + plano VIP mensal

**Frontend:**
- `src/components/shop/VIPBanner.jsx` — banner de assinatura VIP com benefícios
- `src/components/shop/CoinPackages.jsx` — cards de pacotes de OmniCoins com preço real
- `src/hooks/useSubscription.js` — status VIP do usuário + badge na Navbar
- `src/components/ui/VIPBadge.jsx` — badge 👑 VIP no perfil e avatar
- `ShopPage.jsx` atualizado — aba VIP com benefícios + aba Pacotes de Moedas
- `ProfilePage.jsx` atualizado — exibe badge VIP se ativo
- Navbar — badge 👑 ao lado do avatar quando VIP

### Planos e preços (configuráveis pelo Admin)
| Produto | Preço | O que dá |
|---------|-------|----------|
| VIP Mensal | R$9,90/mês | Sem anúncios + cosméticos VIP exclusivos + +10 OmniCoins/dia |
| 100 OmniCoins | R$2,99 | 100 moedas avulsas |
| 500 OmniCoins | R$9,99 | 500 + 50 bônus |
| 1200 OmniCoins | R$19,99 | 1200 + 200 bônus |

**Status:** Concluído 🎉 FASE 3 COMPLETA

### Entregáveis
**Backend:** `migrations/008_create_subscriptions.sql` (tabela subscriptions + coin_packages + função is_user_vip + stripe_customer_id em users) · `services/stripeService.js` (Stripe SDK com cache 5min, chaves do banco) · `models/Subscription.js` · `routes/stripe.js` (checkout VIP, checkout coins, webhook com verificação de assinatura, portal) · `server.js`: raw body para webhook, rotas Stripe/subscription

**Frontend:** `hooks/useSubscription.js` · `components/ui/VIPBadge.jsx` · `components/shop/VIPBanner.jsx` (CTA para não-VIP + painel para VIP ativo) · `components/shop/CoinPackages.jsx` (3 pacotes com preço/bônus, botão desabilitado se Price ID não configurado) · `ShopPage.jsx`: nova aba 👑 VIP como default · `Navbar.jsx`: badge VIP no dropdown + toast de resultado de pagamento · `ProfilePage.jsx`: badge VIP · `AdminPage/ApiKeysPanel.jsx`: grupo Pacotes de OmniCoins

### Critérios de conclusão
- [x] Checkout Stripe abre para assinatura VIP
- [x] Webhook verificado com Stripe-Signature, processa checkout.session.completed, subscription.updated/deleted, invoice.payment_failed
- [x] Badge 👑 VIP no perfil e dropdown da navbar
- [x] Compra de OmniCoins credita automaticamente após webhook
- [x] Cancelamento marca cancel_at_period_end, acesso mantido até o fim do período
- [x] Chaves Stripe lidas do banco via getApiKeyValue() (configuradas no Admin)
- [x] Pacotes de OmniCoins mostram "Em breve" se Stripe Price ID não configurado

---

## Diagrama de Arquitetura (simplificado)

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTE (Browser/Tauri/Capacitor)      │
│                                                             │
│  ┌─────────────┐   ┌──────────────────┐   ┌─────────────┐  │
│  │  Library    │   │  Extensions      │   │  Settings   │  │
│  │  (grid de   │   │  (catálogo +     │   │  (config    │  │
│  │   conteúdo) │   │   instalar)      │   │   usuário)  │  │
│  └──────┬──────┘   └────────┬─────────┘   └─────────────┘  │
│         │                   │ fetch                         │
│  ┌──────▼──────────────────▼──────────────────────────┐    │
│  │              Zustand Store (estado global)          │    │
│  │  installedPlugins · settings · catalog · activeTab  │    │
│  └──────────────────────────┬──────────────────────────┘    │
│         ┌────────────────────┼────────────────────────┐     │
│  ┌──────▼──────┐    ┌───────▼──────┐    ┌────────────▼──┐  │
│  │PluginLoader │    │ImageReader   │    │VideoPlayer    │  │
│  │(sandbox JS) │    │(cascade/paged│    │(HLS + MP4)    │  │
│  └──────┬──────┘    └──────────────┘    └───────────────┘  │
│         │ executa plugin.search() / getDetails() / getPages │
└─────────┼───────────────────────────────────────────────────┘
          │ HTTP fetch (plugins buscam mídia diretamente)
          ▼
   [Fonte de Mídia Externa — não passa pelo backend OmniMedia]

          ↑ GET /api/plugins
┌─────────┴───────────────────────────────────────────────────┐
│              BACKEND VPS (Node.js + Express)                 │
│                                                             │
│  GET  /api/plugins        — Lista catálogo homologado       │
│  GET  /api/plugins/:slug  — Detalhes de plugin              │
│  POST /api/plugins/submit — Submissão comunitária           │
│  GET  /api/health         — Healthcheck                     │
│                                                             │
│  [PostgreSQL] — tabela `extensions` (metadados apenas)      │
└─────────────────────────────────────────────────────────────┘
```

---

## Convenções de Código

- Cada arquivo começa com `// FILE: path/do/arquivo.js`
- Sem placeholders `// implemente aqui` — lógica real em cada patch
- Props TypeScript/JSDoc onde aplicável
- Componentes: PascalCase · Hooks: camelCase prefixado com `use`
- Store actions: verbos (`fetchCatalog`, `installPlugin`, `updateSettings`)

---

## ✅ PATCH #20 — Hardening de Segurança Abrangente
**Status:** Concluído 🎉 PROJETO COMPLETO — todos os 20 patches entregues.

### Cobertura completa

**Backend — 7 novos arquivos**
- `migrations/009_create_security.sql` — colunas 2FA em users, token_family+is_revoked em sessions, tabela security_events imutável (audit log) com enum de 18 tipos, funções log_security_event()/record_failed_login()/record_successful_login(), csp_violations
- `services/logger.js` — Winston estruturado, JSON em prod/colorido em dev, rotação diária (app/error/security logs), requestId em cada entrada
- `services/twoFactorService.js` — TOTP (speakeasy), QR code (qrcode), 8 códigos de backup bcrypt-hasheados, useBackupCode() (one-time use)
- `services/uploadValidator.js` — magic bytes validation: JPEG/PNG/GIF/WebP via assinatura hex, sem dependência de extensão ou MIME header
- `middleware/security.js` — requestId (UUID), Helmet (CSP+HSTS+frameguard+permissionsPolicy), mongoSanitize (NoSQL injection), csrfOriginCheck (same-origin mutations), authSlowDown (express-slow-down), requestLogger (auditoria)
- `middleware/inputSanitizer.js` — sanitizeXss() recursivo (xss lib), isMaliciousInput() (SQL/XSS/path traversal patterns)
- `routes/auth.js` — reescrita: lockout automático (5 falhas=5min, 10=30min), rotação de refresh token com token family, detecção de roubo (token revogado reutilizado revoga toda a família), 2FA no fluxo de login, política de senha (maiúscula+número)
- `routes/security.js` — 2FA setup/verify/disable/backup-codes, GET /security/status, GET /security/events, GET /admin/security/events, POST /security/csp-report
- `server.js` — reescrita: validação obrigatória de env vars na inicialização, pilha de segurança na ordem correta, raw body para Stripe webhook

**Frontend — 4 novos arquivos**
- `components/auth/TwoFactorSetup.jsx` — 3 passos: QR code + chave manual → confirmar código TOTP → exibir códigos de backup (copiar tudo)
- `components/auth/TwoFactorLogin.jsx` — input TOTP ou código de backup, toggle entre os modos
- `pages/SecurityPage.jsx` — status (2FA, sessões, falhas, IP), ativar/desativar 2FA, encerrar todas as sessões, histórico de 15 eventos
- `components/auth/AuthModal.jsx` — atualizado: detecta requires2FA e exibe TwoFactorLogin inline

### Vulnerabilidades resolvidas

| Problema | Solução |
|----------|---------|
| Sem headers de segurança | Helmet: CSP, HSTS, X-Frame-Options, Permissions-Policy |
| XSS via input | sanitizeXss() recursivo em body/query/params |
| NoSQL injection | mongoSanitize em todas as requisições |
| CSRF | csrfOriginCheck para mutações |
| Brute force | authSlowDown + lockout automático por conta |
| Token theft | Rotação de refresh + detecção de reuso (token family) |
| Upload bypass | Magic bytes validation além do MIME header |
| Sem logs | Winston estruturado + security_events no banco |
| Env vars ausentes | Validação obrigatória na inicialização |
| 2FA ausente | TOTP completo + backup codes |
| Sem auditoria | Histórico de eventos de segurança por usuário e global |
