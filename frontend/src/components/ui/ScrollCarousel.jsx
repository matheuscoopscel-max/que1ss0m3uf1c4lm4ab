// FILE: frontend/src/components/ui/ScrollCarousel.jsx
// Carrossel horizontal com scroll snap.
// Usado para seções: Destaques, Populares, Lançamentos.
// Mostra botões de seta no hover em desktop; swipe nativo no mobile.

import { useRef, useState, useCallback } from "react";

/**
 * @param {{
 *   title: string,
 *   children: React.ReactNode,
 *   viewAllLabel?: string,
 *   onViewAll?: () => void,
 * }} props
 */
export function ScrollCarousel({ title, children, viewAllLabel, onViewAll }) {
  const trackRef = useRef(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function updateScrollState() {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }

  const scroll = useCallback((dir) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  }, []);

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg text-om-text">{title}</h2>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="tv-focusable text-xs text-om-accent hover:underline font-medium transition-colors"
          >
            {viewAllLabel ?? "Ver todos"} →
          </button>
        )}
      </div>

      {/* Track com botões de seta */}
      <div className="relative group/carousel">
        {/* Botão esquerda */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10
                       w-9 h-9 rounded-full bg-om-card border border-om-border
                       shadow-xl shadow-black/40 flex items-center justify-center
                       opacity-0 group-hover/carousel:opacity-100 transition-opacity
                       hover:bg-om-surface hover:border-om-accent/40"
            aria-label="Rolar para esquerda"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-om-text">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}

        {/* Scroll track */}
        <div
          ref={trackRef}
          onScroll={updateScrollState}
          className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
          style={{
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* Cada filho deve ter scroll-snap-align: start */}
          {children}
        </div>

        {/* Botão direita */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10
                       w-9 h-9 rounded-full bg-om-card border border-om-border
                       shadow-xl shadow-black/40 flex items-center justify-center
                       opacity-0 group-hover/carousel:opacity-100 transition-opacity
                       hover:bg-om-surface hover:border-om-accent/40"
            aria-label="Rolar para direita"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-om-text">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}

        {/* Fade lateral direito */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-om-bg to-transparent pointer-events-none" />
        )}
      </div>
    </section>
  );
}

/**
 * Item de carrossel — wrapper com scroll-snap-align.
 * @param {{ children: React.ReactNode, width?: string }} props
 */
export function CarouselItem({ children, width = "w-36 sm:w-40" }) {
  return (
    <div
      className={`shrink-0 ${width}`}
      style={{ scrollSnapAlign: "start" }}
    >
      {children}
    </div>
  );
}
