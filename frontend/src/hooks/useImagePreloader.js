// FILE: frontend/src/hooks/useImagePreloader.js
// Pré-carrega imagens adjacentes à página atual para eliminar flash ao virar páginas.
// Mantém um cache de Image objects para evitar re-requisições.

import { useEffect, useRef } from "react";

const PRELOAD_AHEAD = 3;  // páginas à frente para pré-carregar
const PRELOAD_BEHIND = 1; // páginas atrás para manter em cache

/**
 * @param {string[]} urls    - lista completa de URLs de páginas
 * @param {number} currentIndex - índice da página atual
 */
export function useImagePreloader(urls, currentIndex) {
  // Cache persistente entre renders: url → HTMLImageElement
  const cacheRef = useRef(new Map());

  useEffect(() => {
    if (!urls || urls.length === 0) return;

    const start = Math.max(0, currentIndex - PRELOAD_BEHIND);
    const end = Math.min(urls.length - 1, currentIndex + PRELOAD_AHEAD);

    for (let i = start; i <= end; i++) {
      const url = urls[i];
      if (!url || cacheRef.current.has(url)) continue;

      const img = new Image();
      img.src = url;
      // Marca como carregada quando pronta (para debugging)
      img.onload = () => img.dataset.loaded = "true";
      cacheRef.current.set(url, img);
    }

    // Limpa entradas muito antigas (mais de 15 páginas para trás) para não vazar memória
    const threshold = currentIndex - 15;
    if (threshold > 0) {
      for (const [url, img] of cacheRef.current.entries()) {
        const idx = urls.indexOf(url);
        if (idx !== -1 && idx < threshold) {
          img.src = ""; // libera a requisição
          cacheRef.current.delete(url);
        }
      }
    }
  }, [urls, currentIndex]);

  return cacheRef.current;
}
