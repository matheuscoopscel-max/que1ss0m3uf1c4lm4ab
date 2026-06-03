# OmniMedia Project

> Agregador e visualizador unificado de mídias mistas — Open-Source, Modular, Multiplataforma.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Estado | Zustand (com persistência no localStorage) |
| Backend | Node.js + Express |
| Banco (futuro) | PostgreSQL |
| Desktop (futuro) | Tauri |
| Mobile/TV (futuro) | Capacitor |

## Quick Start

### Backend
```bash
cd backend
npm install
npm run dev
# Servidor em: http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App em: http://localhost:5173
```

O Vite já está configurado para fazer proxy de `/api/*` para `localhost:3001`.

## Variáveis de Ambiente

```bash
# backend/.env (opcional — padrão: PORT=3001)
PORT=3001

# frontend/.env (opcional — padrão: /api)
VITE_API_URL=/api
```

## Estrutura de Pastas

```
omnimedia/
├── ROADMAP.md
├── backend/
│   ├── package.json
│   └── server.js               ← API de catálogo de plugins
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── package.json
    └── src/
        ├── main.jsx             ← Entrypoint React
        ├── AppContent.jsx       ← Layout raiz + roteamento por abas
        ├── lib/
        │   └── store.js         ← Zustand store global
        ├── styles/
        │   └── globals.css      ← Tailwind + tokens customizados
        ├── components/
        │   ├── ui/
        │   │   └── Navbar.jsx
        │   └── extensions/
        │       └── PluginCard.jsx
        └── pages/
            ├── LibraryPage.jsx
            ├── ExtensionsPage.jsx
            └── SettingsPage.jsx
```

## Contribuindo

Veja o `ROADMAP.md` para os próximos patches planejados.
