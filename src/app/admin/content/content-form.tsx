"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ContentForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [storageKey, setStorageKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, categoryId, storageKey }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao criar conteúdo.");
      setLoading(false);
      return;
    }

    setTitle("");
    setStorageKey("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <label className="text-xs text-zinc-500">Título</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-600"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-zinc-500">Categoria</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-600"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-zinc-500">
          Storage key (R2) — ex: cidades/video-01.mp4
        </label>
        <input
          value={storageKey}
          onChange={(e) => setStorageKey(e.target.value)}
          required
          className="w-64 rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-600"
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
