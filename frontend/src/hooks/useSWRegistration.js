// FILE: frontend/src/hooks/useSWRegistration.js
// Registra o Service Worker e notifica o usuário quando há uma atualização disponível.

import { useEffect } from "react";
import { isCapacitor, isTauri } from "../lib/platform";
import { toastInfo } from "../components/ui/Toast";

export function useSWRegistration() {
  useEffect(() => {
    // Service Workers não fazem sentido em builds nativas (Tauri/Capacitor)
    if (isTauri || isCapacitor) return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.info("[SW] Registrado com sucesso:", registration.scope);

        // Notifica quando um novo SW está esperando para ativar
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              toastInfo(
                "Nova versão disponível — recarregue para atualizar.",
                0 // sem auto-close
              );
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[SW] Falha no registro:", err.message);
      });
  }, []);
}
