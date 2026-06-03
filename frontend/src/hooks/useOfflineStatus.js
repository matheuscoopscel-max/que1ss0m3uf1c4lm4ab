// FILE: frontend/src/hooks/useOfflineStatus.js
// Detecta perda/retorno de conexão e exibe toast informativo.

import { useEffect, useRef } from "react";
import { toastWarning, toastSuccess } from "../components/ui/Toast";

export function useOfflineStatus() {
  const wasOffline = useRef(!navigator.onLine);

  useEffect(() => {
    function onOffline() {
      wasOffline.current = true;
      toastWarning("Sem conexão — conteúdo em cache disponível.", 0);
    }

    function onOnline() {
      if (wasOffline.current) {
        wasOffline.current = false;
        toastSuccess("Conexão restaurada.");
      }
    }

    window.addEventListener("offline", onOffline);
    window.addEventListener("online",  onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online",  onOnline);
    };
  }, []);
}
