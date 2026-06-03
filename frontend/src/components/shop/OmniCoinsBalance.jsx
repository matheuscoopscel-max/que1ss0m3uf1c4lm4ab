// FILE: frontend/src/components/shop/OmniCoinsBalance.jsx — Patch #21
// Corrigido: atualização em tempo real via eventos + polling leve.

import { useState, useEffect, useCallback } from "react";
import { useOmniStore } from "../../lib/store";
import { api } from "../../lib/api";

// Evento global para disparar refresh de coins de qualquer lugar da app
export const COINS_UPDATED_EVENT = "omnimedia:coins-updated";

export function triggerCoinsRefresh() {
  window.dispatchEvent(new CustomEvent(COINS_UPDATED_EVENT));
}

export function OmniCoinsBalance() {
  const user = useOmniStore((s) => s.user);
  const [balance,   setBalance]   = useState(null);
  const [animating, setAnimating] = useState(false);
  const [prevBalance, setPrev]    = useState(null);

  const fetchBalance = useCallback(async () => {
    if (!user) { setBalance(null); return; }
    const res = await api.get("/shop/me/coins").catch(() => null);
    if (!res?.ok) return;
    const data = await res.json();
    setBalance((prev) => {
      if (prev !== null && data.balance > prev) {
        // Ganhou coins — anima
        setPrev(prev);
        setAnimating(true);
        setTimeout(() => setAnimating(false), 1500);
      }
      return data.balance;
    });
  }, [user]);

  // Fetch inicial ao logar
  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  // Polling leve: a cada 30s enquanto a aba está ativa
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchBalance, 30_000);
    return () => clearInterval(interval);
  }, [user, fetchBalance]);

  // Escuta evento global para refresh imediato
  useEffect(() => {
    window.addEventListener(COINS_UPDATED_EVENT, fetchBalance);
    return () => window.removeEventListener(COINS_UPDATED_EVENT, fetchBalance);
  }, [fetchBalance]);

  if (!user || balance === null) return null;

  const gained = animating && prevBalance !== null ? balance - prevBalance : 0;

  return (
    <div className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-om-surface border border-om-border text-xs font-mono font-semibold text-om-accent select-none">
      <span>🪙</span>
      <span className={`transition-all duration-300 ${animating ? "scale-110 text-yellow-400" : ""}`}>
        {balance.toLocaleString("pt-BR")}
      </span>

      {/* Animação de ganho flutuante */}
      {animating && gained > 0 && (
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-bold text-yellow-400 animate-slide-up pointer-events-none whitespace-nowrap">
          +{gained} 🪙
        </span>
      )}
    </div>
  );
}
