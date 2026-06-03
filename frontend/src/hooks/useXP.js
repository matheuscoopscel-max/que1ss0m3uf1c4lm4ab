// FILE: frontend/src/hooks/useXP.js
import { useState, useEffect, useCallback } from "react";
import { useOmniStore } from "../lib/store";
import { api } from "../lib/api";

export const XP_UPDATED_EVENT = "omnimedia:xp-updated";
export function triggerXPRefresh() {
  window.dispatchEvent(new CustomEvent(XP_UPDATED_EVENT));
}

export function useXP() {
  const user = useOmniStore((s) => s.user);
  const [xpData,  setXpData]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [levelUp, setLevelUp] = useState(null); // { level, xpReward }

  const fetchXP = useCallback(async () => {
    if (!user) { setXpData(null); setLoading(false); return; }
    const res = await api.get("/me/xp").catch(() => null);
    if (res?.ok) {
      const prev = xpData?.level;
      const data = await res.json();
      setXpData(data);
      if (prev && data.level > prev) {
        setLevelUp({ level: data.level });
        setTimeout(() => setLevelUp(null), 4000);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchXP(); }, [fetchXP]);

  useEffect(() => {
    window.addEventListener(XP_UPDATED_EVENT, fetchXP);
    return () => window.removeEventListener(XP_UPDATED_EVENT, fetchXP);
  }, [fetchXP]);

  return { xpData, loading, levelUp, refetch: fetchXP };
}
