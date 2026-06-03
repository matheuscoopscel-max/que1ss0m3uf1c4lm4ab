// FILE: frontend/src/hooks/usePluginBootstrap.js — Patch #11
// Atualizado: carrega plugins instalados no boot + dispara refresh dos repositórios.

import { useEffect, useState } from "react";
import { useOmniStore } from "../lib/store";
import { loadPlugins, unloadPlugin } from "../lib/pluginLoader";
import { isPluginLoaded } from "../lib/pluginRegistry";

export function usePluginBootstrap() {
  const installedPlugins       = useOmniStore((s) => s.installedPlugins);
  const repositories           = useOmniStore((s) => s.repositories);
  const refreshAllRepositories = useOmniStore((s) => s.refreshAllRepositories);
  const [state, setState]      = useState({ ready: false, loaded: 0, failed: 0, errors: [] });

  // Carrega plugins instalados ao montar
  useEffect(() => {
    if (installedPlugins.length === 0) {
      setState({ ready: true, loaded: 0, failed: 0, errors: [] });
      return;
    }

    const toLoad = installedPlugins.filter((p) => !isPluginLoaded(p.slug));
    if (toLoad.length === 0) {
      setState({ ready: true, loaded: installedPlugins.length, failed: 0, errors: [] });
      return;
    }

    setState((s) => ({ ...s, ready: false }));
    loadPlugins(toLoad).then((results) => {
      const errors = results.filter((r) => !r.success).map((r) => r.error ?? r.slug);
      setState({
        ready:  true,
        loaded: results.filter((r) => r.success).length,
        failed: errors.length,
        errors,
      });
    });
  }, [installedPlugins]);

  // Faz refresh dos repositórios que ainda não foram carregados
  useEffect(() => {
    const anyIdle = repositories.some(
      (r) => r.status === "idle" || (r.status === "success" && r.plugins.length === 0)
    );
    if (anyIdle) refreshAllRepositories();
  }, []);

  return state;
}
