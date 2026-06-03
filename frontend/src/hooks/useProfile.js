// FILE: frontend/src/hooks/useProfile.js
// Busca e atualiza dados de perfil — próprio ou de outro usuário.

import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

/**
 * Retorna o perfil do usuário logado + helpers de edição.
 */
export function useMyProfile() {
  const [profile,  setProfile]  = useState(null);
  const [stats,    setStats]    = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes, aRes] = await Promise.all([
        api.get("/me/profile"),
        api.get("/me/profile/stats"),
        api.get("/me/profile/activity"),
      ]);

      if (pRes.ok)  setProfile((await pRes.json()).profile);
      if (sRes.ok)  setStats((await sRes.json()).stats);
      if (aRes.ok)  setActivity((await aRes.json()).activity);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateProfile = useCallback(async (data) => {
    setSaving(true);
    const res = await api.patch("/me/profile", data);
    setSaving(false);
    if (res.ok) {
      const { profile: updated } = await res.json();
      setProfile(updated);
      return { success: true };
    }
    const err = await res.json();
    return { success: false, message: err.message };
  }, []);

  const uploadAvatar = useCallback(async (file) => {
    const form = new FormData();
    form.append("avatar", file);
    setSaving(true);
    const res = await fetch(
      `${(await import("../lib/platform.js")).getApiBaseUrl()}/me/profile/avatar`,
      { method: "POST", body: form, credentials: "include",
        headers: { Authorization: `Bearer ${(await import("../lib/api.js")).getAccessToken()}` } }
    );
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      return { success: true, avatarUrl: data.avatarUrl };
    }
    return { success: false };
  }, []);

  const uploadBanner = useCallback(async (file) => {
    const form = new FormData();
    form.append("banner", file);
    setSaving(true);
    const res = await fetch(
      `${(await import("../lib/platform.js")).getApiBaseUrl()}/me/profile/banner`,
      { method: "POST", body: form, credentials: "include",
        headers: { Authorization: `Bearer ${(await import("../lib/api.js")).getAccessToken()}` } }
    );
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      return { success: true, bannerUrl: data.bannerUrl };
    }
    return { success: false };
  }, []);

  return { profile, stats, activity, loading, saving, error, updateProfile, uploadAvatar, uploadBanner, refetch: fetchProfile };
}

/**
 * Busca o perfil público de outro usuário pelo username.
 */
export function usePublicProfile(username) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    fetch(`${window.location.origin}/api/profiles/${username}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { setData(d); setLoading(false); })
      .catch((err) => { setError(String(err)); setLoading(false); });
  }, [username]);

  return { profile: data?.profile, stats: data?.stats, activity: data?.activity, loading, error };
}
