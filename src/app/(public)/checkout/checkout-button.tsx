"use client";

import { useState } from "react";

export function CheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Erro ao iniciar pagamento.");
      setLoading(false);
      return;
    }

    window.location.href = data.checkoutUrl;
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded bg-white px-4 py-3 text-sm font-medium text-black disabled:opacity-50"
      >
        {loading ? "Redirecionando..." : "Pagar com Mercado Pago"}
      </button>
    </div>
  );
}
