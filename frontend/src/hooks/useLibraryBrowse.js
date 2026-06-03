// FILE: frontend/src/hooks/useLibraryBrowse.js
// Carrega o catálogo completo de cada plugin instalado chamando search("").
// Usado na tela inicial da biblioteca quando não há query de busca ativa.

import { useState, useEffect } from "react";
import { getAllPlugins, isPluginLoaded } from "../lib/pluginRegistry";

/**
 * @typedef {Object} BrowseState
 * @property {import('../types/plugin').CatalogItem[]} items
 * @property {boolean} loading
 * @property {{ [slug: string]: 'loading'|'done'|'error' }} pluginStatus
 */

/**
 * Hook que carrega o catálogo completo de todos os plugins carregados.
 * Re-executa quando pluginsKey muda (novo plugin instalado).
 *
 * @param {string} pluginsKey - chave que muda quando a lista de plugins muda (ex: slugs joined)
 * @returns {BrowseState}
 */
export function useLibraryBrowse(pluginsKey) {
  const [state, setState] = useState({ items: [], loading: false, pluginStatus: {} });

  useEffect(() => {
    const plugins = getAllPlugins();
    if (plugins.length === 0) {
      setState({ items: [], loading: false, pluginStatus: {} });
      return;
    }

    // Status inicial: todos loading
    const initialStatus = Object.fromEntries(plugins.map((p) => [p.slug, "loading"]));
    setState({ items: [], loading: true, pluginStatus: initialStatus });

    let cancelled = false;
    const allItems = [];

    // Carrega cada plugin individualmente para atualizar a UI progressivamente
    const promises = plugins.map(async (plugin) => {
      try {
        const items = await plugin.search("");
        const tagged = items.map((item) => ({ ...item, pluginSlug: plugin.slug }));

        if (cancelled) return;
        allItems.push(...tagged);

        setState((s) => ({
          items: [...allItems],
          loading: true,
          pluginStatus: { ...s.pluginStatus, [plugin.slug]: "done" },
        }));
      } catch (err) {
        console.warn(`[useLibraryBrowse] Plugin "${plugin.slug}" falhou:`, err);
        if (!cancelled) {
          setState((s) => ({
            ...s,
            pluginStatus: { ...s.pluginStatus, [plugin.slug]: "error" },
          }));
        }
      }
    });

    Promise.allSettled(promises).then(() => {
      if (!cancelled) {
        setState((s) => ({ ...s, loading: false }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pluginsKey]);

  return state;
}
