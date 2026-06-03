// FILE: frontend/src/components/ui/HeroBanner.jsx
// Hero banner rotativo com autoplay. Exibe destaque de conteúdo com capa,
// título, tipo, rating, sinopse e botões "Ler Agora" / "Detalhes".
// Troca de slide a cada 7s com transição fade + scale sutil.

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * @param {{
 *   items: import('../../types/plugin').CatalogItem[],
 *   onRead:    (item: any) => void,
 *   onDetails: (item: any) => void,
 * }} props
 */
export function HeroBanner({ items, onRead, onDetails }) {
  const [current, setCurrent] = useState(0);
  const [fading,  setFading]  = useState(false);
  const timerRef = useRef(null);

  const SLIDE_DURATION = 7000;

  const goTo = useCallback((idx) => {
    setFading(true);
    setTimeout(() => {
      setCurrent(idx);
      setFading(false);
    }, 350);
  }, []);

  const next = useCallback(() => {
    goTo((current + 1) % items.length);
  }, [current, items.length, goTo]);

  useEffect(() => {
    if (items.length <= 1) return;
    timerRef.current = setInterval(next, SLIDE_DURATION);
    return () => clearInterval(timerRef.current);
  }, [next, items.length]);

  if (!items || items.length === 0) return null;

  const item = items[current];

  const MEDIA_LABEL = {
    "image-series": "Quadrinhos",
    "ebook":        "E-Book",
    "video-stream": "Vídeo",
  };

  return (
    <div className="relative w-full h-[420px] sm:h-[480px] rounded-2xl overflow-hidden select-none">

      {/* ── Background: capa com blur ────────────────────────────────────── */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
      >
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt=""
            className="w-full h-full object-cover scale-110"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-om-accent/20 via-om-surface to-om-bg" />
        )}
        {/* Gradientes sobrepostos */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
      </div>

      {/* ── Conteúdo ──────────────────────────────────────────────────────── */}
      <div
        className={`relative h-full flex items-end pb-10 px-8 transition-all duration-500 ${
          fading ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
        }`}
      >
        <div className="flex items-end gap-6 max-w-2xl">
          {/* Capa miniatura */}
          {item.coverUrl && (
            <div className="hidden sm:block shrink-0 w-28 h-40 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl shadow-black/60">
              <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" draggable={false} />
            </div>
          )}

          {/* Info */}
          <div className="space-y-3">
            {/* Badge tipo + tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge bg-om-accent text-white text-[11px] font-semibold">
                {MEDIA_LABEL[item.mediaType] ?? item.mediaType}
              </span>
              {item.tags?.slice(0, 3).map((tag) => (
                <span key={tag} className="badge bg-white/10 text-white/70 border border-white/10 text-[10px]">
                  {tag}
                </span>
              ))}
            </div>

            {/* Título */}
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-white leading-tight drop-shadow-lg line-clamp-2">
              {item.title}
            </h2>

            {/* Sinopse */}
            {item.description && (
              <p className="text-sm text-white/70 leading-relaxed line-clamp-2 max-w-lg">
                {item.description}
              </p>
            )}

            {/* Botões */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => onRead(item)}
                className="tv-focusable flex items-center gap-2 px-5 py-2.5 rounded-xl
                           bg-white text-om-bg font-semibold text-sm
                           hover:bg-white/90 active:scale-95 transition-all duration-150 shadow-lg"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                </svg>
                {item.mediaType === "video-stream" ? "Assistir agora" : "Ler agora"}
              </button>

              <button
                onClick={() => onDetails(item)}
                className="tv-focusable flex items-center gap-2 px-5 py-2.5 rounded-xl
                           bg-white/10 text-white font-semibold text-sm border border-white/20
                           hover:bg-white/20 active:scale-95 transition-all duration-150 backdrop-blur-sm"
              >
                Detalhes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Indicadores de slide ──────────────────────────────────────────── */}
      {items.length > 1 && (
        <div className="absolute bottom-3 right-6 flex items-center gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => { clearInterval(timerRef.current); goTo(i); }}
              className={`transition-all duration-300 rounded-full ${
                i === current
                  ? "w-6 h-1.5 bg-white"
                  : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* ── Gradiente inferior para blend com o conteúdo abaixo ──────────── */}
      <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-om-bg to-transparent pointer-events-none" />
    </div>
  );
}
