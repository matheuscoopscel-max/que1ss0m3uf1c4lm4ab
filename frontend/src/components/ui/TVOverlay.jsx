// FILE: frontend/src/components/ui/TVOverlay.jsx
// Barra de status discreta exibida quando o modo TV está ativo.
// Aparece por 4s na primeira ativação, depois desaparece.
// Contém dicas de navegação D-Pad resumidas.

import { useState, useEffect } from "react";
import { useOmniStore } from "../../lib/store";
import { Icon } from "../../lib/icons.jsx";

export function TVOverlay() {
  const tvMode = useOmniStore((s) => s.settings.tvMode);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!tvMode) { setVisible(false); return; }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, [tvMode]);

  if (!visible) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9997] animate-fade-in"
    >
      <div className="flex items-center gap-4 px-5 py-3 bg-om-card/95 backdrop-blur-md border border-om-accent/30 rounded-2xl shadow-2xl shadow-black/60">
        <Icon name="monitorSettings" size={20} className="shrink-0" style={{ filter: "brightness(0) saturate(100%) invert(58%) sepia(75%) saturate(570%) hue-rotate(346deg) brightness(95%) contrast(92%)" }} />
        <div className="flex items-center gap-3 text-xs text-om-muted font-mono divide-x divide-om-border">
          <span className="pr-3 text-om-text font-semibold">Modo TV</span>
          <span className="px-3">
            <kbd className="text-om-accent">↑↓←→</kbd> navegar
          </span>
          <span className="px-3">
            <kbd className="text-om-accent">OK</kbd> selecionar
          </span>
          <span className="pl-3">
            <kbd className="text-om-accent">Esc</kbd> voltar
          </span>
        </div>
      </div>
    </div>
  );
}
