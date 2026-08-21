// FILE: frontend/src/hooks/usePluginBootstrap.js — Patch #31
// O catálogo é curado pelo admin: busca repositórios aprovados +
// slugs ativos no boot, e auto-"instala" (installedPlugins) exatamente os
// plugins que o admin ligou — nenhuma ação manual do usuário é necessária.
// Se o admin desativar um plugin, ele é removido do installedPlugins local
// no próximo boot.

import { useEffect, useState } from "react";
import { useOmniStore } from "../lib/store";
import { loadPlugins } from "../lib/pluginLoader";
import { isPluginLoaded } from "../lib/pluginRegistry";

export function usePluginBootstrap() {
  const installedPlugins        = useOmniStore((s) => s.installedPlugins);
  const installPlugin           = useOmniStore((s) => s.installPlugin);
  const uninstallPlugin         = useOmniStore((s) => s.uninstallPlugin);
  const repositories            = useOmniStore((s) => s.repositories);
  const activePluginSlugs       = useOmniStore((s) => s.activePluginSlugs);
  const getAllRepositoryPlugins = useOmniStore((s) => s.getAllRepositoryPlugins);
  const loadApprovedRepositories = useOmniStore((s) => s.loadApprovedRepositories);
  const loadActivePluginSlugs   = useOmniStore((s) => s.loadActivePluginSlugs);
  const refreshAllRepositories  = useOmniStore((s) => s.refreshAllRepositories);
  const [state, setState]       = useState({ ready: false, loaded: 0, failed: 0, errors: [] });

  // Busca a curadoria do admin uma vez, no boot.
  useEffect(() => {
    loadApprovedRepositories().then(() => refreshAllRepositories());
    loadActivePluginSlugs();
  }, []);

  // Sincroniza installedPlugins com o que o admin ativou, assim que o
  // catálogo dos repositórios e a lista de slugs ativos estiverem prontos.
  useEffect(() => {
    if (activePluginSlugs.length === 0) return;
    const catalog = getAllRepositoryPlugins();
    if (catalog.length === 0) return;

    const activeSet = new Set(activePluginSlugs);
    const toInstall = catalog.filter((p) => activeSet.has(p.slug) && !installedPlugins.some((ip) => ip.slug === p.slug));
    toInstall.forEach((p) => installPlugin(p));

    const toRemove = installedPlugins.filter((p) => !activeSet.has(p.slug));
    toRemove.forEach((p) => uninstallPlugin(p.slug));
  }, [activePluginSlugs, repositories]);

  // Carrega (sandbox) os plugins instalados.
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

  return state;
}
