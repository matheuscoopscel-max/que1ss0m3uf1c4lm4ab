// FILE: frontend/src/components/reader/PagedMode.jsx
// Modo paginado: uma página por vez, com swipe horizontal (touch) e transição suave.
// Suporte a zoom via double-tap/scroll na imagem.

import { useState, useRef, useCallback, useEffect } from "react";
import { useImagePreloader } from "../../hooks/useImagePreloader";

/**
 * @param {{
 *   pages: string[],
 *   currentPage: number,
 *   onPageChange: (index: number) => void,
 *   onLoadError: (index: number) => void
 * }} props
 */
export function PagedMode({ pages, currentPage, onPageChange, onLoadError }) {
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [direction, setDirection] = useState(null); // "left" | "right" | null

  const touchStartRef = useRef(null);
  const lastTapRef = useRef(0);
  const imgRef = useRef(null);

  useImagePreloader(pages, currentPage);

  // Reset zoom e pan ao mudar de página
  useEffect(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setIsLoaded(false);
    setDirection(null);
  }, [currentPage]);

  // ── Swipe horizontal (touch) ───────────────────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (!touchStartRef.current || zoom > 1) return; // ignora swipe com zoom ativo

      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.time;

      // Swipe válido: horizontal dominante, rápido o suficiente, distância mínima
      if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 40 && dt < 400) {
        if (dx < 0 && currentPage < pages.length - 1) {
          setDirection("left");
          onPageChange(currentPage + 1);
        } else if (dx > 0 && currentPage > 0) {
          setDirection("right");
          onPageChange(currentPage - 1);
        }
      }

      touchStartRef.current = null;
    },
    [currentPage, pages.length, onPageChange, zoom]
  );

  // ── Double-tap para zoom ───────────────────────────────────────────────────
  const handleTap = useCallback((e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double-tap: alterna entre 1x e 2x
      e.preventDefault();
      setZoom((z) => (z > 1 ? 1 : 2));
      setPanOffset({ x: 0, y: 0 });
    }
    lastTapRef.current = now;
  }, []);

  // ── Scroll para zoom no desktop ───────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    if (!e.ctrlKey) return; // apenas com Ctrl pressionado
    e.preventDefault();
    setZoom((z) => Math.max(1, Math.min(4, z - e.deltaY * 0.01)));
  }, []);

  const url = pages[currentPage];

  return (
    <div
      className="h-full flex items-center justify-center overflow-hidden select-none relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleTap}
      onWheel={handleWheel}
    >
      {/* Indicador de loading da página */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-om-accent border-t-transparent animate-spin" />
        </div>
      )}

      {url && (
        <img
          ref={imgRef}
          key={url}
          src={url}
          alt={`Página ${currentPage + 1}`}
          className="max-h-full max-w-full object-contain transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            opacity: isLoaded ? 1 : 0,
            transition: "opacity 0.15s ease, transform 0.2s ease",
            cursor: zoom > 1 ? "grab" : "default",
          }}
          onLoad={() => setIsLoaded(true)}
          onError={() => onLoadError(currentPage)}
          draggable={false}
        />
      )}

      {/* Áreas de toque para virar página (terços laterais) */}
      {zoom === 1 && (
        <>
          <button
            className="tv-focusable absolute left-0 top-0 w-1/4 h-full opacity-0 hover:opacity-100 hover:bg-gradient-to-r hover:from-black/20 hover:to-transparent transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              if (currentPage > 0) {
                setDirection("right");
                onPageChange(currentPage - 1);
              }
            }}
            aria-label="Página anterior"
          />
          <button
            className="tv-focusable absolute right-0 top-0 w-1/4 h-full opacity-0 hover:opacity-100 hover:bg-gradient-to-l hover:from-black/20 hover:to-transparent transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              if (currentPage < pages.length - 1) {
                setDirection("left");
                onPageChange(currentPage + 1);
              }
            }}
            aria-label="Próxima página"
          />
        </>
      )}

      {/* Indicador de zoom */}
      {zoom > 1 && (
        <div className="absolute top-3 right-3 badge bg-black/60 text-white/80 backdrop-blur-sm">
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
}
