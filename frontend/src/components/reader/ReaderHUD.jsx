// FILE: frontend/src/components/reader/ReaderHUD.jsx
// HUD flutuante do leitor: número de página, barra de progresso,
// controles de modo (cascata/paginado), fullscreen e navegação.
// Auto-oculta após 3s de inatividade.

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * @param {{
 *   title: string,
 *   chapterTitle: string,
 *   currentPage: number,
 *   totalPages: number,
 *   mode: 'cascade'|'paged',
 *   isFullscreen: boolean,
 *   onPrev: () => void,
 *   onNext: () => void,
 *   onPageJump: (index: number) => void,
 *   onToggleMode: () => void,
 *   onToggleFullscreen: () => void,
 *   onClose: () => void
 * }} props
 */
export function ReaderHUD({
  title,
  chapterTitle,
  currentPage,
  totalPages,
  mode,
  isFullscreen,
  onPrev,
  onNext,
  onPageJump,
  onToggleMode,
  onToggleFullscreen,
  onClose,
}) {
  const [visible, setVisible] = useState(true);
  const hideTimerRef = useRef(null);

  const resetHideTimer = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    window.addEventListener("mousemove", resetHideTimer);
    window.addEventListener("touchstart", resetHideTimer);
    return () => {
      clearTimeout(hideTimerRef.current);
      window.removeEventListener("mousemove", resetHideTimer);
      window.removeEventListener("touchstart", resetHideTimer);
    };
  }, [resetHideTimer]);

  const progress = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;

  return (
    <>
      {/* ── Barra superior ─────────────────────────────────────────────────── */}
      <div
        className={`absolute top-0 inset-x-0 z-20 transition-all duration-300 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
          {/* Botão fechar */}
          <button
            onClick={onClose}
            className="tv-focusable shrink-0 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Fechar leitor"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>

          {/* Títulos */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-display font-semibold text-sm leading-none truncate">
              {title}
            </p>
            <p className="text-white/60 text-xs mt-0.5 truncate">{chapterTitle}</p>
          </div>

          {/* Toggle modo */}
          <button
            onClick={onToggleMode}
            className="tv-focusable shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
            aria-label={`Modo atual: ${mode === "cascade" ? "Cascata" : "Paginado"}`}
          >
            {mode === "cascade" ? (
              <>
                <span>↕</span>
                <span className="hidden sm:inline">Cascata</span>
              </>
            ) : (
              <>
                <span>↔</span>
                <span className="hidden sm:inline">Paginado</span>
              </>
            )}
          </button>

          {/* Fullscreen */}
          <button
            onClick={onToggleFullscreen}
            className="tv-focusable shrink-0 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label={isFullscreen ? "Sair do fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Barra inferior ─────────────────────────────────────────────────── */}
      <div
        className={`absolute bottom-0 inset-x-0 z-20 transition-all duration-300 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full"
        }`}
      >
        <div className="bg-gradient-to-t from-black/80 to-transparent px-4 pt-8 pb-4 space-y-3">
          {/* Barra de progresso clicável */}
          <div className="space-y-1">
            <div
              className="relative h-1 bg-white/20 rounded-full cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                const targetPage = Math.round(ratio * (totalPages - 1));
                onPageJump(Math.max(0, Math.min(totalPages - 1, targetPage)));
              }}
            >
              <div
                className="h-full bg-om-accent rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-om-accent rounded-full shadow-lg transition-all duration-150"
                style={{ left: `calc(${progress}% - 6px)` }}
              />
            </div>
          </div>

          {/* Controles de página */}
          <div className="flex items-center justify-between">
            {/* Prev */}
            <button
              onClick={onPrev}
              disabled={currentPage === 0}
              className="tv-focusable w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>

            {/* Contador */}
            <span className="text-white/80 text-sm font-mono tabular-nums">
              {currentPage + 1} <span className="text-white/40">/</span> {totalPages}
            </span>

            {/* Next */}
            <button
              onClick={onNext}
              disabled={currentPage === totalPages - 1}
              className="tv-focusable w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
