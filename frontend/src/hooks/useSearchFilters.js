// FILE: frontend/src/hooks/useSearchFilters.js
// Gerencia os filtros de busca na URL (URLSearchParams).
// Permite que a URL reflita os filtros ativos — tornando-a compartilhável.
// Ex: /search?q=naruto&type=image-series&genre=acao&sort=popular

import { useState, useCallback, useEffect, useRef } from "react";

/**
 * @typedef {Object} SearchFilters
 * @property {string}   query    — texto de busca
 * @property {string}   type     — 'all' | 'image-series' | 'ebook' | 'video-stream'
 * @property {string}   genre    — slug do gênero ou 'all'
 * @property {string}   status   — 'all' | 'ongoing' | 'completed'
 * @property {string}   sort     — 'relevance' | 'popular' | 'recent' | 'rating'
 * @property {string}   pluginSlug — 'all' | slug específico
 */

const DEFAULT_FILTERS = {
  query:      "",
  type:       "all",
  genre:      "all",
  status:     "all",
  sort:       "relevance",
  pluginSlug: "all",
};

/**
 * @returns {{
 *   filters: SearchFilters,
 *   setFilter: (key: string, value: string) => void,
 *   setQuery: (q: string) => void,
 *   resetFilters: () => void,
 *   hasActiveFilters: boolean,
 *   activeCount: number
 * }}
 */
export function useSearchFilters() {
  // Inicializa a partir da URL atual (se existir ?q= etc.)
  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      query:      params.get("q")      ?? DEFAULT_FILTERS.query,
      type:       params.get("type")   ?? DEFAULT_FILTERS.type,
      genre:      params.get("genre")  ?? DEFAULT_FILTERS.genre,
      status:     params.get("status") ?? DEFAULT_FILTERS.status,
      sort:       params.get("sort")   ?? DEFAULT_FILTERS.sort,
      pluginSlug: params.get("plugin") ?? DEFAULT_FILTERS.pluginSlug,
    };
  });

  // Sincroniza filtros com a URL (sem recarregar a página)
  const syncTimer = useRef(null);
  useEffect(() => {
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (filters.query)                params.set("q",      filters.query);
      if (filters.type      !== "all")  params.set("type",   filters.type);
      if (filters.genre     !== "all")  params.set("genre",  filters.genre);
      if (filters.status    !== "all")  params.set("status", filters.status);
      if (filters.sort      !== "relevance") params.set("sort", filters.sort);
      if (filters.pluginSlug !== "all") params.set("plugin", filters.pluginSlug);

      const qs = params.toString();
      const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(null, "", newUrl);
    }, 300);
    return () => clearTimeout(syncTimer.current);
  }, [filters]);

  const setFilter = useCallback((key, value) => {
    setFilters((s) => ({ ...s, [key]: value }));
  }, []);

  const setQuery = useCallback((q) => {
    setFilters((s) => ({ ...s, query: q }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Conta filtros ativos (exceto query e sort=relevance)
  const activeCount = [
    filters.type      !== "all",
    filters.genre     !== "all",
    filters.status    !== "all",
    filters.sort      !== "relevance",
    filters.pluginSlug !== "all",
  ].filter(Boolean).length;

  const hasActiveFilters = activeCount > 0;

  return { filters, setFilter, setQuery, resetFilters, hasActiveFilters, activeCount };
}
