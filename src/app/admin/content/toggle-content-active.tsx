"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ToggleContentActive({ contentId, active }: { contentId: string; active: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch(`/api/admin/content/${contentId}`, { method: "PATCH" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-zinc-500 disabled:opacity-50"
    >
      {active ? "Desativar" : "Ativar"}
    </button>
  );
}
