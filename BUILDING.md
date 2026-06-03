# OmniMedia — Guia de Build por Plataforma

## Pré-requisitos comuns

```bash
cd frontend
npm install
cp .env.example .env  # edite VITE_API_URL_NATIVE com a URL do seu VPS
```

---

## 🌐 Web (desenvolvimento)

```bash
# Terminal 1: backend
cd backend && npm install && npm run dev

# Terminal 2: frontend
cd frontend && npm run dev
# Acesse: http://localhost:5173
```

## 🌐 Web (produção)

```bash
cd frontend
npm run build          # gera dist/
# Sirva dist/ com nginx, Caddy, ou qualquer servidor estático
```

---

## 🖥 Desktop (Tauri — Windows / Linux / macOS)

### Pré-requisitos
- [Rust](https://rustup.rs/) (stable)  
- Windows: Visual Studio C++ Build Tools  
- Linux: `libwebkit2gtk-4.1-dev build-essential curl wget libssl-dev libgtk-3-dev`  
- macOS: Xcode Command Line Tools

```bash
cd frontend

# Instala o CLI do Tauri (se não tiver)
npm install

# Desenvolvimento (abre a janela nativa com hot-reload)
npm run dev:desktop

# Build de produção (gera .exe / .AppImage / .dmg em src-tauri/target/release/)
npm run build:desktop
```

### Saídas
| Plataforma | Arquivo gerado |
|-----------|----------------|
| Windows | `src-tauri/target/release/bundle/msi/OmniMedia_1.0.0_x64_en-US.msi` |
| Linux | `src-tauri/target/release/bundle/appimage/OmniMedia_1.0.0_amd64.AppImage` |
| macOS | `src-tauri/target/release/bundle/dmg/OmniMedia_1.0.0_x64.dmg` |

---

## 📱 Android (Capacitor)

### Pré-requisitos
- Java 17+ (`JAVA_HOME` configurado)
- Android Studio com SDK 34+
- `ANDROID_HOME` apontando para o SDK

```bash
cd frontend

# 1. Primeira vez: inicializa o projeto Android
npx cap add android

# 2. Build do frontend + sincronização com Android
npm run build:android
# Ou manualmente:
#   npm run build && npx cap sync android

# 3a. Abre no Android Studio (para gerar APK assinado)
npm run cap:open:android

# 3b. Ou executa direto no emulador/device conectado
npm run dev:android
```

### APK / AAB de produção
No Android Studio: **Build → Generate Signed Bundle / APK**

---

## 📺 Android TV (Capacitor)

O mesmo APK do Android funciona em Android TV graças ao `AndroidManifest.xml`
configurado com `LEANBACK_LAUNCHER` e `android.hardware.touchscreen required="false"`.

A `MainActivity.java` detecta Android TV via `UiModeManager` e injeta
`window.__OMNIMEDIA_TV__ = true` antes do carregamento do app,
ativando automaticamente o Modo TV (D-Pad, FocusRing, 10-ft UI).

```bash
# Emulador Android TV (via Android Studio AVD)
# Crie um AVD com imagem "Android TV (1080p)" e execute:
npm run dev:android
```

---

## 🔧 Variáveis de ambiente importantes

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL_NATIVE` | URL da API para builds mobile/desktop. **Obrigatório em produção.** |
| `VITE_API_URL` | Override da URL da API para builds web. |

Edite `frontend/.env.production` antes de buildar:
```bash
VITE_API_URL_NATIVE=https://api.seudomain.com/api
```

---

## 🏗 Estrutura de builds

```
frontend/
├── dist/                    ← build web (nginx/CDN)
├── src-tauri/
│   └── target/release/
│       └── bundle/          ← .exe / .AppImage / .dmg
└── android/
    └── app/build/outputs/
        └── apk/release/     ← .apk
```
