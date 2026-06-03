// FILE: frontend/capacitor.config.ts
// Configuração do Capacitor para builds Android (telefone + Android TV).
// Execute: npx cap sync android  (após npm run build)

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.omnimedia.android",
  appName: "OmniMedia",
  webDir: "dist",

  // URL do servidor de dev (usado em modo live-reload com npx cap run android)
  // Em produção, remova esta linha.
  server: {
    androidScheme: "https",
    // url: "http://SEU_IP_LOCAL:5173",  // descomente para live reload
  },

  android: {
    // Permite carregar plugins externos via fetch (blob: + https:)
    allowMixedContent: false,
    captureInput: true,
    // Tema da barra de status compatível com nosso dark mode
    backgroundColor: "#0a0a0f",
  },

  plugins: {
    // SplashScreen: exibição durante carregamento inicial
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0a0a0f",
      androidSplashResourceName: "splash",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },

    // StatusBar: barra de status escura para dark mode
    StatusBar: {
      style: "Dark",
      backgroundColor: "#0a0a0f",
    },
  },
};

export default config;
