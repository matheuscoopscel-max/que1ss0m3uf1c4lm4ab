// FILE: frontend/src/components/shop/ItemCard.jsx
// Card de item da loja com preview do cosmético, preço e botão comprar/equipar.

import { useState } from "react";
import { useOmniStore } from "../../lib/store";
import { api } from "../../lib/api";
import { toastSuccess, toastError } from "../ui/Toast";

const TYPE_LABELS = {
  avatar_frame:     "Frame de Avatar",
  banner:           "Banner",
  badge:            "Badge",
  title_decoration: "Decoração",
};

export function ItemCard({ item, onUpdate }) {
  const user    = useOmniStore((s) => s.user);
  const [loading, setLoading] = useState(false);

  async function handleBuy() {
    if (!user) { toastError("Faça login para comprar itens."); return; }
    setLoading(true);
    const res  = await api.post("/shop/purchase", { slug: item.slug });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { toastSuccess(`"${item.name}" adquirido!`); onUpdate?.(); }
    else toastError(data.message ?? "Erro na compra.");
  }

  async function handleEquip() {
    if (!user) return;
    setLoading(true);
    const res = await api.post("/shop/equip", { slug: item.slug });
    setLoading(false);
    if (res.ok) { toastSuccess(`"${item.name}" equipado!`); onUpdate?.(); }
    else { const d = await res.json(); toastError(d.message ?? "Erro."); }
  }

  const typeLabel = TYPE_LABELS[item.type] ?? item.type;
  const isFree    = item.priceCoins === 0;

  return (
    <div className="bg-om-card border border-om-border rounded-2xl overflow-hidden animate-fade-in hover:border-om-accent/30 transition-all duration-200 group">
      {/* Preview do cosmético */}
      <div className="relative aspect-square bg-om-surface flex items-center justify-center overflow-hidden">
        {item.previewUrl ? (
          <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          // Demonstra o efeito visualmente com o avatar padrão
          <div className={`w-16 h-16 rounded-full bg-om-accent/20 flex items-center justify-center ${item.cssClass ?? ""}`}>
            <span className="font-display font-bold text-om-accent text-xl">O</span>
          </div>
        )}

        {/* Badge tipo */}
        <span className="absolute top-2 left-2 badge bg-black/60 text-white/80 backdrop-blur-sm text-[10px]">
          {typeLabel}
        </span>

        {/* Limitado */}
        {item.isLimited && (
          <span className="absolute top-2 right-2 badge bg-yellow-500/80 text-om-bg text-[10px] font-semibold">
            Limitado
          </span>
        )}

        {/* Equipado */}
        {item.equipped && (
          <span className="absolute bottom-2 right-2 badge bg-om-safe/80 text-white text-[10px]">
            ✓ Equipado
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div>
          <p className="font-display font-semibold text-sm text-om-text leading-tight">{item.name}</p>
          {item.description && (
            <p className="text-[11px] text-om-muted leading-relaxed mt-0.5 line-clamp-2">{item.description}</p>
          )}
        </div>

        {/* Preço + botão */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {isFree ? (
              <span className="text-xs text-om-safe font-semibold">Grátis</span>
            ) : (
              <>
                <span className="text-base leading-none">🪙</span>
                <span className="text-sm font-bold text-om-accent font-mono">{item.priceCoins.toLocaleString("pt-BR")}</span>
              </>
            )}
          </div>

          {item.owned ? (
            <button
              onClick={handleEquip}
              disabled={loading || item.equipped}
              className="tv-focusable px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                         disabled:opacity-50
                         bg-om-surface border border-om-border text-om-muted hover:border-om-accent/40 hover:text-om-accent"
            >
              {item.equipped ? "Equipado" : "Equipar"}
            </button>
          ) : (
            <button
              onClick={handleBuy}
              disabled={loading || !user}
              className="tv-focusable px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95
                         bg-om-accent hover:bg-om-accent-dim text-white disabled:opacity-50"
            >
              {loading ? "…" : isFree ? "Obter" : "Comprar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
