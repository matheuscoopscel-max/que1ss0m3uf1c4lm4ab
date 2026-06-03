// FILE: frontend/vite.config.js — Patch #8
// Adicionado: configuração para Tauri (clearScreen, host) e build otimizado.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],

  // Tauri espera que a porta seja fixa e não abra o browser
  clearScreen: false,

  server: {
    port: 5173,
    strictPort: true,  // Tauri depende desta porta exata
    host: true,        // Capacitor precisa de acesso via IP da rede local
    proxy: {
      // Só aplica o proxy em modo dev (não existe em builds nativas)
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },

  build: {
    // Tauri usa ES modules modernos no WebView — pode usar target moderno
    target: command === "build" ? ["es2021", "chrome100", "safari13"] : "esnext",
    // Não minifica sourcemaps em produção para facilitar debug de builds nativas
    sourcemap: false,
    // Divide chunks para carregamento mais rápido em WebViews Android
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react":    ["react", "react-dom"],
          "vendor-zustand":  ["zustand"],
          "vendor-hls":      ["hls.js"],
        },
      },
    },
  },

  // Define para que platform.js possa ler em tempo de build
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "1.0.0"),
  },
}));
