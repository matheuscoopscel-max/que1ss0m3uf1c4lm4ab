"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao criar categoria.");
      setLoading(false);
      return;
    }

    setName("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="space-y-1">
        <label htmlFor="category-name" className="text-xs text-zinc-500">
          Nova categoria
        </label>
        <input
          id="category-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-600"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
      >
        Adicionar
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
