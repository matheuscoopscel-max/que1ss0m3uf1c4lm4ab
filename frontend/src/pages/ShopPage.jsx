// FILE: frontend/src/pages/ShopPage.jsx
// Loja de cosméticos: catálogo de itens, inventário e histórico de transações.

import { useState, useEffect, useCallback } from "react";
import { useOmniStore } from "../lib/store";
import { api } from "../lib/api";
import { ItemCard }       from "../components/shop/ItemCard";
import { VIPBanner }      from "../components/shop/VIPBanner";
import { CoinPackages }   from "../components/shop/CoinPackages";

const ITEM_TYPES = [
  { id: "all",              label: "Todos"       },
  { id: "avatar_frame",     label: "Frames"      },
  { id: "badge",            label: "Badges"      },
  { id: "banner",           label: "Banners"     },
  { id: "title_decoration", label: "Decorações"  },
];

export function ShopPage() {
  const user = useOmniStore((s) => s.user);
  const [items,        setItems]        = useState([]);
  const [inventory,    setInventory]    = useState([]);
  const [coins,        setCoins]        = useState({ balance: 0, totalEarned: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState("shop");
  const [typeFilter,   setTypeFilter]   = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [itemsRes] = await Promise.all([
      fetch(user ? "/api/shop/items" : "/api/shop/items").then((r) => r.json()),
    ]);
    setItems(itemsRes.items ?? []);

    if (user) {
      const [invRes, coinsRes, txRes] = await Promise.all([
        api.get("/shop/me/inventory").then((r) => r.json()),
        api.get("/shop/me/coins").then((r) => r.json()),
        api.get("/shop/me/transactions").then((r) => r.json()),
      ]);
      setInventory(invRes.inventory ?? []);
      setCoins({ balance: coinsRes.balance ?? 0, totalEarned: coinsRes.totalEarned ?? 0 });
      setTransactions(txRes.transactions ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredItems = typeFilter === "all"
    ? items
    : items.filter((i) => i.type === typeFilter);

  const TABS = [
    { id: "vip",       label: "👑 VIP"      },
    { id: "coins",     label: "🪙 Comprar Coins" },
    { id: "shop",      label: "Loja"       },
    { id: "inventory", label: "Inventário", authOnly: true },
    { id: "history",   label: "Histórico",  authOnly: true },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-om-text">Loja</h1>
          <p className="text-om-muted text-sm mt-0.5">Cosméticos para personalizar seu perfil.</p>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-om-card border border-om-border">
              <span className="text-lg">🪙</span>
              <div>
                <p className="text-lg font-bold text-om-accent font-mono leading-none">
                  {coins.balance.toLocaleString("pt-BR")}
                </p>
                <p className="text-[10px] text-om-muted font-mono">
                  {coins.totalEarned.toLocaleString("pt-BR")} ganhos no total
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-om-surface border border-om-border rounded-xl p-1 w-fit">
        {TABS.filter((t) => !t.authOnly || user).map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`tv-focusable px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === id ? "bg-om-card text-om-text shadow-sm" : "text-om-muted hover:text-om-text"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── VIP ─────────────────────────────────────────────────────── */}
      {activeTab === "vip" && (
        <div className="max-w-3xl"><VIPBanner /></div>
      )}

      {/* ── Pacotes de Coins ─────────────────────────────────────────── */}
      {activeTab === "coins" && (
        <div className="max-w-3xl"><CoinPackages /></div>
      )}

      {/* ── Loja ────────────────────────────────────────────────────── */}
      {activeTab === "shop" && (
        <div className="space-y-4">
          {/* Como ganhar OmniCoins */}
          <div className="p-4 rounded-2xl bg-om-accent/5 border border-om-accent/20">
            <p className="text-sm font-semibold text-om-accent mb-2">🪙 Como ganhar OmniCoins</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-om-muted">
              {[["Publicar post", "+5"], ["Comentar", "+2"], ["Ler um capítulo", "+1"], ["Concluir título", "+20"], ["Login diário", "+5"], ["Convidar amigo", "+50"]].map(([a, v]) => (
                <div key={a} className="flex items-center justify-between bg-om-surface rounded-xl px-3 py-2">
                  <span>{a}</span>
                  <span className="text-om-accent font-mono font-bold">{v} 🪙</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filtro por tipo */}
          <div className="flex gap-1 flex-wrap">
            {ITEM_TYPES.map((t) => (
              <button key={t.id} onClick={() => setTypeFilter(t.id)}
                className={`tv-focusable px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  typeFilter === t.id ? "bg-om-accent/15 text-om-accent border-om-accent/30" : "border-om-border text-om-muted hover:text-om-text bg-om-surface"
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden"><div className="skeleton aspect-square" /><div className="p-3 space-y-2"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/2" /></div></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 stagger-grid">
              {filteredItems.map((item) => (
                <ItemCard key={item.id} item={item} onUpdate={fetchData} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Inventário ────────────────────────────────────────────── */}
      {activeTab === "inventory" && (
        <div className="space-y-3">
          {inventory.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🎒</p>
              <p className="text-om-muted text-sm">Seu inventário está vazio.</p>
              <button onClick={() => setActiveTab("shop")} className="mt-2 text-xs text-om-accent hover:underline">
                Ir para a loja
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 stagger-grid">
              {inventory.map((item) => (
                <ItemCard key={item.id} item={{ ...item, owned: true }} onUpdate={fetchData} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Histórico ─────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <p className="text-center text-om-muted text-sm py-12">Nenhuma transação ainda.</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-om-card border border-om-border rounded-xl">
                <div>
                  <p className="text-sm text-om-text">{tx.reason?.replace(/_/g, " ") ?? tx.type}</p>
                  {tx.itemName && <p className="text-xs text-om-muted">{tx.itemName}</p>}
                  <p className="text-[11px] text-om-muted/60 font-mono">
                    {new Date(tx.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <span className={`text-sm font-bold font-mono ${tx.type === "earn" ? "text-om-safe" : "text-om-danger"}`}>
                  {tx.type === "earn" ? "+" : "-"}{tx.amount} 🪙
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
