// FILE: frontend/src/hooks/useSubscription.js
// Gerencia o status de assinatura VIP do usuário.

import { useState, useEffect, useCallback } from "react";
import { useOmniStore } from "../lib/store";
import { api } from "../lib/api";
import { getApiBaseUrl } from "../lib/platform";

export function useSubscription() {
  const user = useOmniStore((s) => s.user);
  const [subscription, setSubscription] = useState(null);
  const [isVip,        setIsVip]        = useState(false);
  const [loading,      setLoading]      = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!user) { setIsVip(false); setLoading(false); return; }
    try {
      const res  = await api.get("/me/subscription");
      const data = await res.json();
      setSubscription(data.subscription);
      setIsVip(data.isVip ?? false);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  /**
   * Redireciona para o Stripe Checkout (assinatura VIP).
   */
  const subscribeVip = useCallback(async () => {
    if (!user) return;
    const res  = await api.post("/stripe/checkout/subscription", {});
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }, [user]);

  /**
   * Redireciona para o Stripe Checkout (pacote de OmniCoins).
   */
  const buyCoins = useCallback(async (packageSlug) => {
    if (!user) return;
    const res  = await api.post("/stripe/checkout/coins", { packageSlug });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else if (data.message) throw new Error(data.message);
  }, [user]);

  /**
   * Abre o Stripe Customer Portal para gerenciar assinatura.
   */
  const openPortal = useCallback(async () => {
    const res  = await api.post("/me/subscription/portal", {});
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
  }, []);

  /**
   * Cancela a assinatura ao fim do período.
   */
  const cancelVip = useCallback(async () => {
    const res = await api.post("/me/subscription/cancel", {});
    if (res.ok) { await fetchStatus(); return true; }
    return false;
  }, [fetchStatus]);

  return { subscription, isVip, loading, subscribeVip, buyCoins, openPortal, cancelVip, refetch: fetchStatus };
}
