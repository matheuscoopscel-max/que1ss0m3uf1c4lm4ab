// FILE: frontend/src/hooks/usePlugin.js
// Hook que expõe os métodos de um plugin carregado com estado de loading/erro.
// Cada chamada é rastreada individualmente para UI granular.

import { useState, useCallback } from "react";
import { getPlugin } from "../lib/pluginRegistry";

/**
 * @template T
 * @typedef {Object} PluginCallState
 * @property {T|null} data
 * @property {boolean} loading
 * @property {string|null} error
 */

/**
 * Retorna os métodos do plugin especificado, cada um com estado próprio.
 * Retorna null para todos os métodos se o plugin não estiver carregado.
 *
 * @param {string|null} slug - Slug do plugin a usar
 * @returns {{ plugin: import('../types/plugin').PluginInstance|null, search, getDetails, getPagesOrStream }}
 */
export function usePlugin(slug) {
  const plugin = slug ? getPlugin(slug) : null;

  // Estado individual para cada operação
  const [searchState, setSearchState] = useState({ data: null, loading: false, error: null });
  const [detailsState, setDetailsState] = useState({ data: null, loading: false, error: null });
  const [streamState, setStreamState] = useState({ data: null, loading: false, error: null });

  /**
   * Wrapper genérico que executa uma fn do plugin com gestão de estado.
   * @param {Function} setState
   * @param {Function} fn
   * @param  {...any} args
   */
  const call = useCallback(async (setState, fn, ...args) => {
    if (!fn) {
      setState({ data: null, loading: false, error: "Plugin não carregado." });
      return null;
    }
    setState({ data: null, loading: true, error: null });
    try {
      const result = await fn(...args);
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ data: null, loading: false, error: msg });
      return null;
    }
  }, []);

  const search = useCallback(
    (query) => call(setSearchState, plugin?.search?.bind(plugin), query),
    [plugin, call]
  );

  const getDetails = useCallback(
    (id) => call(setDetailsState, plugin?.getDetails?.bind(plugin), id),
    [plugin, call]
  );

  const getPagesOrStream = useCallback(
    (id, chapterEpisodeId) =>
      call(setStreamState, plugin?.getPagesOrStream?.bind(plugin), id, chapterEpisodeId),
    [plugin, call]
  );

  return {
    plugin,
    search,
    searchState,
    getDetails,
    detailsState,
    getPagesOrStream,
    streamState,
  };
}
