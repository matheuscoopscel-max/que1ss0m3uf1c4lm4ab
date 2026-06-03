// FILE: frontend/src/hooks/useTVCursor.js
// Oculta o cursor do mouse quando o modo TV está ativo.
// Reexibe brevemente ao mover o mouse (tolerância de 3s),
// permitindo uso híbrido mouse + controle remoto.

import { useEffect, useRef } from "react";
import { useOmniStore } from "../lib/store";

const HIDE_DELAY_MS = 3000;

export function useTVCursor() {
  const tvMode = useOmniStore((s) => s.settings.tvMode);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!tvMode) {
      // Garante que o cursor volte ao normal ao desativar TV mode
      document.documentElement.style.cursor = "";
      return;
    }

    // Oculta imediatamente
    document.documentElement.style.cursor = "none";

    function onMouseMove() {
      document.documentElement.style.cursor = "default";
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        document.documentElement.style.cursor = "none";
      }, HIDE_DELAY_MS);
    }

    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      clearTimeout(timerRef.current);
      document.documentElement.style.cursor = "";
    };
  }, [tvMode]);
}
