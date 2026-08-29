"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserRowActions({
  userId,
  active,
  role,
}: {
  userId: string;
  active: boolean;
  role: "USER" | "ADMIN";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleActive() {
    setLoading(true);
    await fetch(`/api/admin/users/${userId}/toggle-active`, { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  async function toggleRole() {
    const nextRole = role === "ADMIN" ? "USER" : "ADMIN";
    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Erro ao trocar role.");
    }
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={toggleActive}
        disabled={loading}
        className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-zinc-500 disabled:opacity-50"
      >
        {active ? "Desativar" : "Ativar"}
      </button>
      <button
        type="button"
        onClick={toggleRole}
        disabled={loading}
        className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-zinc-500 disabled:opacity-50"
      >
        {role === "ADMIN" ? "Remover admin" : "Tornar admin"}
      </button>
    </div>
  );
}
