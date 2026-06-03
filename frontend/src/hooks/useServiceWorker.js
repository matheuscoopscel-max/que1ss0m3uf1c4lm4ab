// FILE: frontend/src/hooks/useServiceWorker.js
// Registra o Service Worker e expõe estado de atualização disponível.
// Quando uma nova versão do SW está pronta, exibe toast para o usuário recarregar.

import { useEffect } from "react";
import { toastInfo } from "../components/ui/Toast";
import { isTauri } from "../lib/platform";

export function useServiceWorker() {
  useEffect(() => {
    // Tauri não usa SW — o app é nativo e já está offline por padrão
    if (isTauri) return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.info("[SW] Registrado:", registration.scope);

        // Detecta quando uma nova versão do SW está aguardando ativação
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // Há uma nova versão disponível
              toastInfo(
                "Nova versão disponível. Recarregue para atualizar.",
                0 // duração 0 = persiste até o usuário fechar
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
