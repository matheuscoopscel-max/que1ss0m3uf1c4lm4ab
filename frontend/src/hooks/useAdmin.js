// FILE: frontend/src/hooks/useAdmin.js
// Verifica se o usuário logado é admin e fornece helpers para a API admin.

import { useState, useEffect, useCallback } from "react";
import { useOmniStore } from "../lib/store";
import { api } from "../lib/api";

/**
 * Retorna { isAdmin, loading } para proteção de rotas.
 * Consulta o servidor porque o JWT pode estar desatualizado.
 */
export function useAdminGuard() {
  const user     = useOmniStore((s) => s.user);
  const [isAdmin,  setIsAdmin]  = useState(false);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user) { setIsAdmin(false); setLoading(false); return; }
    api.get("/admin/stats")
      .then((r) => { setIsAdmin(r.ok); setLoading(false); })
      .catch(() => { setIsAdmin(false); setLoading(false); });
  }, [user]);

  return { isAdmin, loading };
}

/**
 * Hook de dados do painel admin com refresh.
 */
export function useAdminData(endpoint) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}
