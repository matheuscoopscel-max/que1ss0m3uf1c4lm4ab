// FILE: frontend/src/components/shop/CoinPackages.jsx
// Cards de pacotes de OmniCoins para compra avulsa via Stripe.

import { useState, useEffect } from "react";
import { useOmniStore } from "../../lib/store";
import { useSubscription } from "../../hooks/useSubscription";
import { toastError } from "../ui/Toast";

export function CoinPackages() {
  const user = useOmniStore((s) => s.user);
  const { buyCoins } = useSubscription();
  const [packages,  setPackages]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [buying,    setBuying]    = useState(null); // slug do pacote em processamento

  useEffect(() => {
    fetch("/api/stripe/packages")
      .then((r) => r.json())
      .then((d) => { setPackages(d.packages ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleBuy(pkg) {
    if (!user) { toastError("Faça login para comprar OmniCoins."); return; }
    if (!pkg.stripePriceId) {
      toastError(`Pacote "${pkg.name}" ainda não configurado. Aguarde o admin configurar o Stripe Price ID.`);
      return;
    }
    setBuying(pkg.slug);
    try {
      await buyCoins(pkg.slug);
    } catch (err) {
      toastError(err.message ?? "Erro ao iniciar compra.");
      setBuying(null);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-om-muted leading-relaxed">
        OmniCoins são a moeda virtual do OmniMedia. Use para comprar cosméticos na loja,
        ou ganhe de graça através da atividade na plataforma.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {packages.map((pkg) => {
          const isProcessing = buying === pkg.slug;
          const isNotConfigured = !pkg.stripePriceId;

          return (
            <div
              key={pkg.slug}
              className={`relative rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-200 ${
                pkg.isFeatured
                  ? "border-om-accent/50 bg-om-accent/5 ring-1 ring-om-accent/20"
                  : "border-om-border bg-om-card hover:border-om-accent/30"
              }`}
            >
              {/* Badge destaque */}
              {pkg.isFeatured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge bg-om-accent text-white text-[11px] font-bold px-3 py-1 shadow-md">
                  MAIS POPULAR
                </span>
              )}

              {/* Ícone + moedas */}
              <div className="text-center">
                <div className="text-4xl mb-2">🪙</div>
                <p className="font-display font-bold text-2xl text-om-accent tabular-nums">
                  {pkg.coins.toLocaleString("pt-BR")}
                </p>
                {pkg.bonusCoins > 0 && (
                  <p className="text-xs text-om-safe font-semibold">
                    + {pkg.bonusCoins} bônus = {pkg.totalCoins} total
                  </p>
                )}
              </div>

              {/* Nome + preço */}
              <div className="text-center">
                <p className="font-semibold text-sm text-om-text">{pkg.name}</p>
                <p className="font-display font-bold text-xl text-om-text mt-1">
                  R${pkg.priceBrl.toFixed(2).replace(".", ",")}
                </p>
                <p className="text-[11px] text-om-muted">
                  R${(pkg.priceBrl / pkg.totalCoins * 100).toFixed(2).replace(".", ",")} por 100 moedas
                </p>
              </div>

              {/* Botão comprar */}
              <button
                onClick={() => handleBuy(pkg)}
                disabled={isProcessing || !user || isNotConfigured}
                className={`tv-focusable w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-60 ${
                  pkg.isFeatured
                    ? "bg-om-accent hover:bg-om-accent-dim text-white"
                    : "bg-om-surface border border-om-border hover:border-om-accent/50 text-om-text"
                }`}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Redirecionando…
                  </span>
                ) : isNotConfigured ? (
                  "Em breve"
                ) : (
                  "Comprar agora"
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
