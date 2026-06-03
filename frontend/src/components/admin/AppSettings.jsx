// FILE: frontend/src/components/admin/AppSettings.jsx
// Configurações gerais do app editáveis pelo admin.

import { useState, useEffect } from "react";
import { useAdminData } from "../../hooks/useAdmin";
import { api } from "../../lib/api";
import { toastSuccess, toastError } from "../ui/Toast";

export function AppSettings() {
  const { data, loading, refetch } = useAdminData("/admin/settings");
  const [form,   setForm]   = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data?.settings) return;
    const obj = {};
    data.settings.forEach((s) => { obj[s.key] = s.value ?? ""; });
    setForm(obj);
  }, [data]);

  async function handleSave() {
    setSaving(true);
    const res = await api.post("/admin/settings", { settings: form });
    setSaving(false);
    if (res.ok) toastSuccess("Configurações salvas.");
    else toastError("Erro ao salvar configurações.");
  }

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>;

  const settings = data?.settings ?? [];
  const publicSettings  = settings.filter((s) => s.is_public);
  const privateSettings = settings.filter((s) => !s.is_public);

  function SettingField({ setting }) {
    const isBool = form[setting.key] === "true" || form[setting.key] === "false";
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-om-text">{setting.description ?? setting.key}</label>
          <code className="text-[10px] font-mono text-om-muted/60">{setting.key}</code>
          {setting.is_public && <span className="badge bg-om-safe/10 text-om-safe border border-om-safe/20 text-[10px]">público</span>}
        </div>
        {isBool ? (
          <button
            onClick={() => setForm((f) => ({ ...f, [setting.key]: f[setting.key] === "true" ? "false" : "true" }))}
            className={`relative w-11 h-6 rounded-full transition-all duration-200 ${form[setting.key] === "true" ? "bg-om-accent" : "bg-om-border"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${form[setting.key] === "true" ? "translate-x-5" : ""}`} />
          </button>
        ) : (
          <input
            type="text"
            value={form[setting.key] ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, [setting.key]: e.target.value }))}
            className="w-full max-w-sm bg-om-surface border border-om-border rounded-xl px-4 py-2.5 text-sm text-om-text outline-none focus:border-om-accent/60 transition-colors"
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-om-card border border-om-border rounded-2xl p-5 space-y-5">
        <h3 className="font-display font-semibold text-om-text">Configurações públicas</h3>
        {publicSettings.map((s) => <SettingField key={s.key} setting={s} />)}
      </div>

      <div className="bg-om-card border border-om-border rounded-2xl p-5 space-y-5">
        <h3 className="font-display font-semibold text-om-text">Configurações internas</h3>
        {privateSettings.map((s) => <SettingField key={s.key} setting={s} />)}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="tv-focusable flex items-center gap-2 px-6 py-3 rounded-xl bg-om-accent hover:bg-om-accent-dim text-white font-semibold text-sm disabled:opacity-60 transition-all active:scale-95"
      >
        {saving && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
        Salvar configurações
      </button>
    </div>
  );
}
