// FILE: frontend/src/components/ui/FocusRing.jsx
// Indicador de foco externo e animado para o modo TV.
// Renderizado como overlay sobre o elemento focado,
// calculando posição via getBoundingClientRect + IntersectionObserver.
// Monta uma única instância no AppContent — não requer wrapper em cada elemento.

import { useState, useEffect, useRef } from "react";
import { useOmniStore } from "../../lib/store";

export function FocusRing() {
  const tvMode = useOmniStore((s) => s.settings.tvMode);
  const [ring, setRing] = useState(null); // { top, left, width, height } | null
  const rafRef = useRef(null);

  useEffect(() => {
    if (!tvMode) {
      setRing(null);
      return;
    }

    function updateRing() {
      const focused = document.activeElement;
      if (
        !focused ||
        focused === document.body ||
        focused === document.documentElement
      ) {
        setRing(null);
        return;
      }

      const rect = focused.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setRing(null);
        return;
      }

      setRing({
        top:    rect.top    + window.scrollY - 4,
        left:   rect.left   + window.scrollX - 4,
        width:  rect.width  + 8,
        height: rect.height + 8,
      });
    }

    function onFocusChange() {
      cancelAnimationFrame(rafRef.current);
      // rAF garante que o DOM atualizou antes de medir
      rafRef.current = requestAnimationFrame(updateRing);
    }

    document.addEventListener("focusin",  onFocusChange);
    document.addEventListener("focusout", () => setRing(null));
    window.addEventListener("scroll",     onFocusChange, true);
    window.addEventListener("resize",     onFocusChange);

    return () => {
      document.removeEventListener("focusin",  onFocusChange);
      document.removeEventListener("focusout", () => setRing(null));
      window.removeEventListener("scroll",     onFocusChange, true);
      window.removeEventListener("resize",     onFocusChange);
      cancelAnimationFrame(rafRef.current);
    };
  }, [tvMode]);

  if (!tvMode || !ring) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position:      "absolute",
        top:           ring.top,
        left:          ring.left,
        width:         ring.width,
        height:        ring.height,
        pointerEvents: "none",
        zIndex:        9998,
        borderRadius:  "14px",
        boxShadow:     "0 0 0 3px #e8841a, 0 0 20px 4px rgba(232,132,26,0.5)",
        transition:    "top 80ms ease, left 80ms ease, width 80ms ease, height 80ms ease",
      }}
    />
  );
}
