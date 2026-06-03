// FILE: frontend/src/hooks/usePlayerKeyboard.js
// Atalhos de teclado para o player de vídeo.
// Space/K: play/pause | ←/J: -10s | →/L: +10s | ↑/↓: volume
// M: mute | F: fullscreen | Esc: fechar

import { useEffect } from "react";

/**
 * @param {{
 *   onTogglePlay: () => void,
 *   onSkipBack: () => void,
 *   onSkipForward: () => void,
 *   onVolumeUp: () => void,
 *   onVolumeDown: () => void,
 *   onToggleMute: () => void,
 *   onToggleFullscreen: () => void,
 *   onClose: () => void,
 *   enabled: boolean
 * }} handlers
 */
export function usePlayerKeyboard({
  onTogglePlay,
  onSkipBack,
  onSkipForward,
  onVolumeUp,
  onVolumeDown,
  onToggleMute,
  onToggleFullscreen,
  onClose,
  enabled = true,
}) {
  useEffect(() => {
    if (!enabled) return;

    function handleKey(e) {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          onTogglePlay();
          break;
        case "ArrowLeft":
        case "j":
        case "J":
          e.preventDefault();
          onSkipBack();
          break;
        case "ArrowRight":
        case "l":
        case "L":
          e.preventDefault();
          onSkipForward();
          break;
        case "ArrowUp":
          e.preventDefault();
          onVolumeUp();
          break;
        case "ArrowDown":
          e.preventDefault();
          onVolumeDown();
          break;
        case "m":
        case "M":
          onToggleMute();
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
  }, [enabled, onTogglePlay, onSkipBack, onSkipForward,
      onVolumeUp, onVolumeDown, onToggleMute, onToggleFullscreen, onClose]);
}
