// FILE: frontend/src/hooks/useAuth.js
// Gerencia o estado de autenticação: login, cadastro, logout e refresh automático.
// Ao fazer login, sincroniza os plugins instalados localmente com o servidor.

import { useCallback } from "react";
import { useOmniStore } from "../lib/store";
import { api, setAccessToken } from "../lib/api";
import { toastSuccess, toastError } from "../components/ui/Toast";

/**
 * Hook de autenticação.
 * Expõe: user, isAuthenticated, login, register, logout, refreshSession.
 */
export function useAuth() {
  const user            = useOmniStore((s) => s.user);
  const setUser         = useOmniStore((s) => s.setUser);
  const installedPlugins = useOmniStore((s) => s.installedPlugins);

  const isAuthenticated = !!user;

  /**
   * Sincroniza plugins instalados localmente com o servidor após login.
   */
  const syncInstallations = useCallback(async () => {
    if (installedPlugins.length === 0) return;

    const res = await api.post("/me/installations/sync", {
      plugins: installedPlugins.map((p) => ({
        slug:          p.slug,
        repositoryUrl: p.repositoryUrl ?? "",
        name:          p.name,
        version:       p.version,
      })),
    });

    if (res.ok) {
      const data = await res.json();
      console.info(`[Auth] ${data.synced} plugin(s) sincronizados com a conta.`);
    }
  }, [installedPlugins]);

  /**
   * Carrega os plugins instalados da conta e mescla com os locais.
   */
  const loadServerInstallations = useCallback(async (store) => {
    const res = await api.get("/me/installations");
    if (!res.ok) return;

    const data = await res.json();
    const serverPlugins = data.installations ?? [];

    // Mescla: plugins do servidor que não estão localmente
    const localSlugs = store.getState().installedPlugins.map((p) => p.slug);
    for (const sp of serverPlugins) {
      if (!localSlugs.includes(sp.slug)) {
        store.getState().installPlugin({
          slug:          sp.slug,
          name:          sp.name ?? sp.slug,
          version:       sp.version ?? "0.0.0",
          repositoryUrl: sp.repositoryUrl,
          scriptUrl:     "",  // será resolvido pelo loader via repositório
        });
      }
    }
  }, []);

  /**
   * Login com email e senha.
   */
  const login = useCallback(async ({ email, password, totpToken, backupCode }) => {
    const res = await api.post("/auth/login", { email, password, totpToken, backupCode });
    const data = await res.json();

    if (!res.ok) {
      if (data.requires2FA) return { success: false, requires2FA: true };
      toastError(data.message ?? "Falha ao fazer login.");
      return { success: false, message: data.message };
    }

    setAccessToken(data.accessToken);
    setUser(data.user);

    // Sincroniza plugins locais → servidor e carrega os do servidor → local
    await syncInstallations();

    toastSuccess(`Bem-vindo, ${data.user.username}!`);
    return { success: true };
  }, [syncInstallations]);

  /**
   * Cadastro com email, username e senha.
   */
  const register = useCallback(async ({ email, username, password }) => {
    const res  = await api.post("/auth/register", { email, username, password });
    const data = await res.json();

    if (!res.ok) {
      const message = data.errors?.[0]?.msg ?? data.message ?? "Falha ao criar conta.";
      toastError(message);
      return { success: false, errors: data.errors, message };
    }

    setAccessToken(data.accessToken);
    setUser(data.user);

    // Sincroniza plugins locais com a nova conta
    await syncInstallations();

    toastSuccess(`Conta criada! Bem-vindo, ${data.user.username}! 🎉 Você ganhou 10 🪙 de boas-vindas.`);
    return { success: true };
  }, [syncInstallations]);

  /**
   * Logout: invalida a sessão no servidor e limpa estado local.
   */
  const logout = useCallback(async () => {
    await api.post("/auth/logout", {});
    setAccessToken(null);
    setUser(null);
    toastSuccess("Você saiu da conta.");
  }, []);

  /**
   * Tenta renovar a sessão ao abrir o app (usa httpOnly cookie).
   * Chamado pelo AppContent na montagem.
   */
  const refreshSession = useCallback(async () => {
    const res = await fetch(`${(await import("../lib/platform.js")).getApiBaseUrl()}/auth/refresh`, {
      method:      "POST",
      credentials: "include",
    });

    if (!res.ok) return false;

    const data = await res.json();
    setAccessToken(data.accessToken);
    setUser(data.user);
    return true;
  }, []);

  return { user, isAuthenticated, login, register, logout, refreshSession };
}
