# Contribuindo com o OmniMedia

Obrigado por considerar contribuir! Este guia cobre três formas de contribuição:
**desenvolvimento do core**, **criação de plugins** e **reportar bugs**.

---

## 1. Criando um Plugin

A forma mais impactante de contribuir é construir um plugin que amplia o catálogo para a comunidade.

### Setup rápido

```bash
# Clone o repositório de template de plugin
git clone https://github.com/omnimedia-community/plugin-template meu-plugin
cd meu-plugin
npm install
```

### Estrutura recomendada

```
meu-plugin/
├── src/
│   └── index.js          # implementação do plugin
├── dist/
│   └── plugin.js         # bundle final (gerado por npm run build)
├── package.json
└── README.md
```

### Testando localmente

1. Execute o OmniMedia em modo dev: `cd frontend && npm run dev`
2. Coloque seu `plugin.js` em `frontend/public/plugins/meu-plugin.js`
3. No backend mock (`server.js`), adicione uma entrada com `scriptUrl: "/plugins/meu-plugin.js"`
4. Instale o plugin pela aba Extensões

### Interface obrigatória

Veja [PLUGIN_SPEC.md](./PLUGIN_SPEC.md) para a especificação completa.

### Submetendo ao catálogo oficial

```bash
curl -X POST https://api.omnimedia.app/api/plugins/submit \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "meu-plugin",
    "name": "Meu Plugin",
    "scriptUrl": "https://cdn.jsdelivr.net/...",
    ...
  }'
```

---

## 2. Contribuindo com o Core

### Pré-requisitos

- Node.js 22+
- Docker (para o banco de dados)
- Rust + Cargo (apenas para builds Tauri/Desktop)

### Setup de desenvolvimento

```bash
git clone https://github.com/omnimedia-community/omnimedia
cd omnimedia

# Backend
cd backend
cp .env.example .env
docker compose up -d db    # sobe só o PostgreSQL
npm install
npm run migrate && npm run seed
npm run dev                # http://localhost:3001

# Frontend (em outro terminal)
cd ../frontend
npm install
npm run dev                # http://localhost:5173
```

### Estrutura do projeto

```
omnimedia/
├── backend/               # API Node.js + Express + PostgreSQL
│   ├── src/
│   │   ├── db/            # pool de conexões
│   │   ├── middleware/    # rate limiter, error handler
│   │   ├── models/        # acesso a dados (DAL)
│   │   ├── routes/        # routers Express
│   │   └── services/      # validadores, utilitários
│   ├── migrations/        # SQL de schema e seed
│   └── scripts/           # migrate.js, seed.js
│
├── frontend/              # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/    # UI, library, player, reader, extensions
│   │   ├── hooks/         # lógica reutilizável
│   │   ├── lib/           # store, loaders, platform
│   │   ├── pages/         # páginas principais
│   │   └── types/         # JSDoc types
│   ├── src-tauri/         # configuração Tauri (Desktop)
│   ├── android/           # projeto Capacitor (Mobile/TV)
│   └── public/
│       ├── plugins/       # plugins mock de desenvolvimento
│       └── sw.js          # Service Worker
│
├── .github/workflows/     # CI/CD GitHub Actions
├── BUILDING.md            # guia de build por plataforma
├── PLUGIN_SPEC.md         # especificação da interface de plugins
└── docker-compose.yml     # PostgreSQL + API
```

### Convenções de código

- Arquivos começam com `// FILE: path/do/arquivo.js`
- Componentes: **PascalCase** (`ContentCard.jsx`)
- Hooks: **camelCase** prefixado com `use` (`useSearch.js`)
- Store actions: **verbos** (`fetchCatalog`, `installPlugin`)
- Sem `// implemente aqui` — escreva a lógica real
- Sem TypeScript (`.ts`) — JSDoc para tipos

### Branches e commits

```
main          → produção
develop       → desenvolvimento ativo
feature/xxx   → nova feature
fix/xxx       → correção de bug
patch/xxx     → patch incremental do roadmap
```

Mensagens de commit em português ou inglês, no formato:
```
feat: adiciona suporte a streams DASH no player
fix: corrige crash ao desinstalar plugin sem sandbox
docs: atualiza PLUGIN_SPEC com exemplo de StreamUrl
```

### Abrindo um Pull Request

1. Fork → branch `feature/sua-feature` → commits → PR para `develop`
2. Descreva o que muda e por quê
3. O CI deve passar (build + syntax check)
4. Pelo menos um mantenedor aprova antes do merge

---

## 3. Reportando Bugs

Abra uma [Issue no GitHub](https://github.com/omnimedia-community/omnimedia/issues) com:

- **Título** claro e descritivo
- **Passos para reproduzir** (numerados)
- **Comportamento esperado** vs **comportamento atual**
- **Ambiente**: OS, browser/plataforma, versão do app
- **Logs** do console (F12) se disponíveis

---

## Código de Conduta

- Seja respeitoso e construtivo
- Nenhuma forma de discriminação ou assédio
- Conteúdo adulto só em plugins devidamente sinalizados como `restricted`
- Não submeta plugins que violem direitos autorais ou Termos de Serviço de terceiros

---

## Licença

OmniMedia é licenciado sob a **MIT License**.
Ao contribuir, você concorda que sua contribuição será licenciada sob os mesmos termos.
