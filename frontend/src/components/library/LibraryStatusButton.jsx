// FILE: frontend/src/components/library/LibraryStatusButton.jsx
// Botão flutuante exibido no hover do ContentCard para adicionar/mudar status.
// Abre um mini-menu com as opções de status.

import { useState, useRef, useEffect } from "react";
import { useLibraryStatus } from "../../hooks/useLibraryStatus";

const STATUS_OPTIONS = [
  { value: "reading",   label: "Lendo",      emoji: "📖", color: "text-sky-400"    },
  { value: "watching",  label: "Assistindo", emoji: "📺", color: "text-emerald-400" },
  { value: "saved",     label: "Salvar",     emoji: "🔖", color: "text-yellow-400"  },
  { value: "completed", label: "Concluído",  emoji: "✅", color: "text-om-safe"     },
  { value: "dropped",   label: "Largar",     emoji: "🚫", color: "text-om-muted"    },
];

const STATUS_LABEL = {
  reading:   { label: "Lendo",      bg: "bg-sky-500/20 text-sky-300 border-sky-500/30"          },
  watching:  { label: "Assistindo", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  saved:     { label: "Salvo",      bg: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"  },
  completed: { label: "Concluído",  bg: "bg-om-safe/20 text-om-safe border-om-safe/30"           },
  dropped:   { label: "Largado",    bg: "bg-om-muted/20 text-om-muted border-om-border"          },
};

/**
 * @param {{
 *   item: import('../../types/plugin').CatalogItem,
 *   className?: string
 * }} props
 */
export function LibraryStatusButton({ item, className = "" }) {
  const [open, setOpen]   = useState(false);
  const menuRef           = useRef(null);

  const libraryItem = {
    pluginSlug:    item.pluginSlug,
    itemId:        item.id,
    itemTitle:     item.title,
    itemCoverUrl:  item.coverUrl,
    itemMediaType: item.mediaType,
    repositoryUrl: item.repositoryUrl ?? "",
  };

  const { status, isFavorite, setStatus, toggleFavorite, removeFromLibrary } =
    useLibraryStatus(libraryItem);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!menuRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentStatus = STATUS_LABEL[status];

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      {/* Badge atual / botão de adicionar */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`tv-focusable flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all duration-150 backdrop-blur-sm ${
          currentStatus
            ? `${currentStatus.bg}`
            : "bg-black/50 text-white/70 border-white/20 hover:bg-black/70"
        }`}
      >
        {currentStatus ? currentStatus.label : "+ Adicionar"}
      </button>

      {/* Dropdown de opções */}
      {open && (
        <div
          className="absolute bottom-full left-0 mb-1 w-40 bg-om-card border border-om-border rounded-xl shadow-2xl shadow-black/60 z-50 overflow-hidden animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatus(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-om-surface transition-colors ${
                status === opt.value ? "bg-om-surface" : ""
              } ${opt.color}`}
            >
              <span>{opt.emoji}</span>
              <span className="text-om-text">{opt.label}</span>
              {status === opt.value && <span className="ml-auto text-om-accent">✓</span>}
            </button>
          ))}

          <div className="border-t border-om-border">
            {/* Favorito toggle */}
            <button
              onClick={() => { toggleFavorite(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-om-surface transition-colors"
            >
              <span>{isFavorite ? "❤️" : "🤍"}</span>
              <span className="text-om-text">{isFavorite ? "Remover favorito" : "Favoritar"}</span>
            </button>

            {/* Remover da biblioteca */}
            {status && (
              <button
                onClick={() => { removeFromLibrary(); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-om-danger hover:bg-om-danger/10 transition-colors"
              >
                <span>✕</span>
                <span>Remover</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
