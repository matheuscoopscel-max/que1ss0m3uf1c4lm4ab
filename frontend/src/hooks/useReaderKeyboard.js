// FILE: frontend/src/hooks/useReaderKeyboard.js
// Navegação por teclado/D-Pad para o leitor de imagens.
// Suporta: setas, espaço, Page Up/Down, W/A/S/D, F (fullscreen), M (modo), Escape.

import { useEffect } from "react";

/**
 * @param {{
 *   onNext: () => void,
 *   onPrev: () => void,
 *   onToggleMode: () => void,
 *   onToggleFullscreen: () => void,
 *   onClose: () => void,
 *   enabled: boolean
 * }} handlers
 */
export function useReaderKeyboard({
  onNext,
  onPrev,
  onToggleMode,
  onToggleFullscreen,
  onClose,
  enabled = true,
}) {
  useEffect(() => {
    if (!enabled) return;

    function handleKey(e) {
      // Ignora quando foco está em input/textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "d":
        case "s":
        case " ":
        case "PageDown":
          e.preventDefault();
          onNext();
          break;

        case "ArrowLeft":
        case "ArrowUp":
        case "a":
        case "w":
        case "PageUp":
          e.preventDefault();
          onPrev();
          break;

        case "m":
        case "M":
          onToggleMode();
          break;

        case "f":
        case "F":
          onToggleFullscreen();
          break;

        case "Escape":
          onClose();
          break;

        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [enabled, onNext, onPrev, onToggleMode, onToggleFullscreen, onClose]);
}
