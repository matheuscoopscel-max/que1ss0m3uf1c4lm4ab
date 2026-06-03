// FILE: frontend/src/hooks/useSearch.js
// Busca unificada: executa plugin.search() em todos os plugins carregados
// em paralelo e agrega os resultados, injetando pluginSlug em cada item.

import { useState, useCallback, useRef } from "react";
import { getAllPlugins } from "../lib/pluginRegistry";

/**
 * @typedef {Object} SearchState
 * @property {import('../types/plugin').CatalogItem[]} results
 * @property {boolean} loading
 * @property {string|null} error
 * @property {string} query           - última query executada
 * @property {{ [slug: string]: number }} countByPlugin
 */

/**
 * Hook de busca unificada.
 * Executa search() em todos os plugins registrados em paralelo.
 * Resultados de plugins com erro são descartados silenciosamente (com log).
 *
 * @returns {{ state: SearchState, search: (q: string) => void, clear: () => void }}
 */
export function useSearch() {
  const [state, setState] = useState({
    results: [],
    loading: false,
    error: null,
    query: "",
    countByPlugin: {},
  });

  // Ref para cancelar buscas obsoletas quando uma nova é disparada
  const searchIdRef = useRef(0);

  const search = useCallback(async (query) => {
    const trimmed = query.trim();

    if (!trimmed) {
      setState({ results: [], loading: false, error: null, query: "", countByPlugin: {} });
      return;
    }

    const currentId = ++searchIdRef.current;
    setState((s) => ({ ...s, loading: true, error: null, query: trimmed }));

    const plugins = getAllPlugins();

    if (plugins.length === 0) {
      setState({ results: [], loading: false, error: null, query: trimmed, countByPlugin: {} });
      return;
    }

    // Executa search() em cada plugin em paralelo, capturando erros individuais
    const settled = await Promise.allSettled(
      plugins.map((plugin) =>
        plugin
          .search(trimmed)
          .then((items) =>
            // Injeta pluginSlug em cada item retornado
            items.map((item) => ({ ...item, pluginSlug: plugin.slug }))
          )
      )
    );

    // Se uma busca mais nova foi disparada, descarta este resultado
    if (currentId !== searchIdRef.current) return;

    const results = [];
    const countByPlugin = {};

    settled.forEach((outcome, i) => {
      const slug = plugins[i].slug;
      if (outcome.status === "fulfilled") {
        results.push(...outcome.value);
        countByPlugin[slug] = outcome.value.length;
      } else {
        console.warn(`[useSearch] Plugin "${slug}" falhou na busca:`, outcome.reason);
        countByPlugin[slug] = 0;
      }
    });

    setState({ results, loading: false, error: null, query: trimmed, countByPlugin });
  }, []);

  const clear = useCallback(() => {
    searchIdRef.current++;
    setState({ results: [], loading: false, error: null, query: "", countByPlugin: {} });
  }, []);

  return { state, search, clear };
}
