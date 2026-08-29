"use client";

import { useState } from "react";

export function SettingsForm({
  settingKey,
  label,
  initialValue,
}: {
  settingKey: string;
  label: string;
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: settingKey, value }),
    });

    setLoading(false);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <label className="text-xs text-zinc-500">{label}</label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          className="flex-1 rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-600"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          Salvar
        </button>
      </div>
      {saved && <p className="text-xs text-green-400">Salvo.</p>}
    </form>
  );
}
