// FILE: frontend/src/components/reader/CascadeMode.jsx
// Modo cascata: scroll vertical contínuo.
// Usa IntersectionObserver para rastrear qual página está visível
// e notificar o componente pai — sem forçar scroll programático.

import { useRef, useEffect, useCallback } from "react";
import { useImagePreloader } from "../../hooks/useImagePreloader";

/**
 * @param {{
 *   pages: string[],
 *   currentPage: number,
 *   onPageChange: (index: number) => void,
 *   onLoadError: (index: number) => void
 * }} props
 */
export function CascadeMode({ pages, currentPage, onPageChange, onLoadError }) {
  const containerRef = useRef(null);
  const pageRefs = useRef([]);
  const observerRef = useRef(null);

  useImagePreloader(pages, currentPage);

  // Scroll programático apenas na montagem ou quando currentPage muda via controles externos
  // (evita loop: scroll → observer → onPageChange → scroll)
  const lastProgrammaticPage = useRef(-1);

  useEffect(() => {
    if (currentPage === lastProgrammaticPage.current) return;
    const el = pageRefs.current[currentPage];
    if (el) {
      lastProgrammaticPage.current = currentPage;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentPage]);

  // IntersectionObserver: detecta qual página ocupa mais de 40% da viewport
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Pega a entrada com maior intersectionRatio
        const mostVisible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (mostVisible) {
          const idx = parseInt(mostVisible.target.dataset.index, 10);
          if (!isNaN(idx)) {
            lastProgrammaticPage.current = idx;
            onPageChange(idx);
          }
        }
      },
      {
        root: containerRef.current,
        threshold: [0.1, 0.4, 0.6, 0.9],
      }
    );

    pageRefs.current.forEach((el) => {
      if (el) observerRef.current.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [pages, onPageChange]);

  const setPageRef = useCallback((el, i) => {
    pageRefs.current[i] = el;
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto overflow-x-hidden scroll-smooth"
      style={{ scrollbarWidth: "thin" }}
    >
      <div className="flex flex-col items-center gap-1 pb-16">
        {pages.map((url, i) => (
          <PageImage
            key={url + i}
            url={url}
            index={i}
            setRef={(el) => setPageRef(el, i)}
            onError={() => onLoadError(i)}
          />
        ))}

        {/* Indicador de fim */}
        <div className="py-8 text-center text-om-muted text-sm font-mono">
          — fim do capítulo —
        </div>
      </div>
    </div>
  );
}

function PageImage({ url, index, setRef, onError }) {
  return (
    <div
      ref={setRef}
      data-index={index}
      className="w-full max-w-2xl relative"
    >
      <img
        src={url}
        alt={`Página ${index + 1}`}
        className="w-full h-auto block select-none"
        loading={index < 3 ? "eager" : "lazy"}
        onError={onError}
        draggable={false}
      />
    </div>
  );
}
