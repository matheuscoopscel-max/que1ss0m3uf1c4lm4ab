// FILE: frontend/src/hooks/useTVNavigation.js
// Navegação espacial por D-Pad para TV/teclado.
//
// Estratégia:
//   1. Coleta todos os elementos com [data-tv-focusable] ou .tv-focusable visíveis
//   2. Na tecla direcional, calcula qual elemento está mais próximo na direção pressionada
//      usando bounding rects (algoritmo de "neighbor search" por eixo primário + secundário)
//   3. Move o foco programaticamente para o elemento encontrado
//   4. Enter/Ok dispara click() no elemento focado
//
// Ativação: o hook só age quando tvMode === true no store.

import { useEffect, useCallback, useRef } from "react";
import { useOmniStore } from "../lib/store";

// ── Geometria ─────────────────────────────────────────────────────────────────

function getCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

/**
 * Retorna todos os elementos focáveis visíveis no DOM.
 * @returns {Element[]}
 */
function getFocusableElements() {
  return Array.from(
    document.querySelectorAll(
      ".tv-focusable, [data-tv-focusable], button:not([disabled]), [tabindex]:not([tabindex='-1']), a[href], input:not([disabled]), select:not([disabled])"
    )
  ).filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.offsetParent === null) return false; // oculto
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

/**
 * Encontra o elemento mais próximo na direção especificada.
 * Algoritmo: filtra candidatos que estão "à frente" no eixo primário,
 * então ordena pela distância euclidiana ponderada (eixo principal tem peso maior).
 *
 * @param {Element} current
 * @param {'up'|'down'|'left'|'right'} direction
 * @param {Element[]} candidates
 * @returns {Element|null}
 */
function findNeighbor(current, direction, candidates) {
  const cr = current.getBoundingClientRect();
  const cc = getCenter(cr);
  const EDGE_THRESHOLD = 10; // px de tolerância para elementos no mesmo nível

  const ahead = candidates.filter((el) => {
    if (el === current) return false;
    const er = el.getBoundingClientRect();
    const ec = getCenter(er);

    switch (direction) {
      case "up":    return ec.y < cc.y - EDGE_THRESHOLD;
      case "down":  return ec.y > cc.y + EDGE_THRESHOLD;
      case "left":  return ec.x < cc.x - EDGE_THRESHOLD;
      case "right": return ec.x > cc.x + EDGE_THRESHOLD;
      default:      return false;
    }
  });

  if (ahead.length === 0) return null;

  // Pondera distância: eixo primário tem peso 1, eixo secundário tem peso 3
  // Isso favorece elementos "em linha" antes de elementos "diagonais"
  return ahead.reduce((best, el) => {
    const er = el.getBoundingClientRect();
    const ec = getCenter(er);
    const dx = ec.x - cc.x;
    const dy = ec.y - cc.y;

    let dist;
    if (direction === "up" || direction === "down") {
      dist = Math.abs(dy) + Math.abs(dx) * 3;
    } else {
      dist = Math.abs(dx) + Math.abs(dy) * 3;
    }

    if (!best) return { el, dist };
    return dist < best.dist ? { el, dist } : best;
  }, null)?.el ?? null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTVNavigation() {
  const tvMode = useOmniStore((s) => s.settings.tvMode);
  const lastFocusedRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (!tvMode) return;

      const KEY_MAP = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        // Teclas de TV/controle remoto (Android TV / LGTV / Tizen)
        Up: "up",
        Down: "down",
        Left: "left",
        Right: "right",
      };

      const direction = KEY_MAP[e.key];

      if (direction) {
        e.preventDefault();

        const focused = document.activeElement;
        const elements = getFocusableElements();

        // Se nenhum elemento estiver focado, foca o primeiro
        if (!focused || !elements.includes(focused)) {
          const first = elements[0];
          if (first) {
            (/** @type {HTMLElement} */ (first)).focus();
            lastFocusedRef.current = first;
          }
          return;
        }

        const neighbor = findNeighbor(focused, direction, elements);
        if (neighbor) {
          (/** @type {HTMLElement} */ (neighbor)).focus();
          lastFocusedRef.current = neighbor;
          // Scroll suave para garantir visibilidade
          neighbor.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
        }
        return;
      }

      // Enter / OK do controle remoto
      if (e.key === "Enter" || e.key === "Accept" || e.key === "Return") {
        const focused = document.activeElement;
        if (focused && focused !== document.body) {
          // Não previne default para botões nativos funcionarem normalmente
          if (!(focused instanceof HTMLButtonElement) && !(focused instanceof HTMLAnchorElement)) {
            e.preventDefault();
            (/** @type {HTMLElement} */ (focused)).click();
          }
        }
      }
    },
    [tvMode]
  );

  // Foca o primeiro elemento ao ativar o modo TV
  useEffect(() => {
    if (!tvMode) return;

    const elements = getFocusableElements();
    if (elements.length > 0) {
      (/** @type {HTMLElement} */ (elements[0])).focus();
    }
  }, [tvMode]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
