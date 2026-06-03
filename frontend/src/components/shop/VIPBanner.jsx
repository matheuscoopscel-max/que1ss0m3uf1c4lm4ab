// FILE: frontend/src/components/shop/VIPBanner.jsx
// Banner do plano VIP com benefícios e botão de assinar.
// Exibe status atual se o usuário já for VIP.

import { useState } from "react";
import { useOmniStore } from "../../lib/store";
import { useSubscription } from "../../hooks/useSubscription";
import { VIPBadge } from "../ui/VIPBadge";

const VIP_BENEFITS = [
  { icon: "🚫", label: "Sem anúncios",           desc: "Experiência limpa, sem interrupções"       },
  { icon: "👑", label: "Cosméticos VIP",          desc: "Acesso a itens exclusivos da loja"         },
  { icon: "🪙", label: "+10 OmniCoins/dia",       desc: "Bônus diário de moedas automaticamente"    },
  { icon: "⚡", label: "Acesso antecipado",        desc: "Novas funcionalidades primeiro"            },
  { icon: "🎨", label: "Frame VIP exclusivo",     desc: "Moldura dourada no avatar"                 },
  { icon: "💬", label: "Badge na comunidade",     desc: "Destaque nos posts e comentários"          },
];

export function VIPBanner({ onSubscribed }) {
  const user = useOmniStore((s) => s.user);
  const { isVip, subscription, loading, subscribeVip, cancelVip, openPortal } = useSubscription();
  const [subscribing, setSubscribing] = useState(false);
  const [canceling,   setCanceling]   = useState(false);

  async function handleSubscribe() {
    if (!user) return;
    setSubscribing(true);
    try { await subscribeVip(); }
    catch { setSubscribing(false); }
  }

  async function handleCancel() {
    setCanceling(true);
    await cancelVip();
    setCanceling(false);
  }

  // ── Usuário já é VIP ───────────────────────────────────────────────────────
  if (!loading && isVip && subscription) {
    const periodEnd = subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
      : null;

    return (
      <div className="relative rounded-3xl overflow-hidden border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-om-card p-6 animate-fade-in">
        <div className="absolute top-4 right-4 opacity-10 text-8xl leading-none select-none">👑</div>

        <div className="relative space-y-3">
          <div className="flex items-center gap-3">
            <VIPBadge size="lg" />
            <p className="font-display font-bold text-xl text-om-text">Você é VIP!</p>
          </div>
          <p className="text-sm text-om-muted">
            {subscription.cancelAtPeriodEnd
              ? `Assinatura cancelada — acesso até ${periodEnd}.`
              : `Próxima cobrança em ${periodEnd}.`}
          </p>

          <div className="flex gap-3 flex-wrap">
            <button onClick={openPortal}
              className="tv-focusable px-4 py-2 rounded-xl border border-yellow-500/30 text-yellow-400 text-sm font-semibold hover:bg-yellow-500/10 transition-colors">
              Gerenciar assinatura
            </button>
            {!subscription.cancelAtPeriodEnd && (
              <button onClick={handleCancel} disabled={canceling}
                className="tv-focusable px-4 py-2 rounded-xl border border-om-danger/30 text-om-danger text-sm hover:bg-om-danger/10 transition-colors disabled:opacity-60">
                {canceling ? "Cancelando…" : "Cancelar assinatura"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── CTA para não-VIPs ──────────────────────────────────────────────────────
  return (
    <div className="relative rounded-3xl overflow-hidden border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-om-card animate-fade-in">
      {/* Decoração */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-6 space-y-5">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-3xl">👑</span>
            <h2 className="font-display font-bold text-2xl text-om-text">OmniMedia VIP</h2>
          </div>
          <p className="text-om-muted text-sm leading-relaxed max-w-lg">
            Desbloqueie a experiência completa com acesso a cosméticos exclusivos, sem anúncios e bônus diários de OmniCoins.
          </p>
        </div>

        {/* Benefícios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {VIP_BENEFITS.map((b) => (
            <div key={b.label} className="flex items-start gap-3 p-3 rounded-xl bg-om-surface/60 border border-om-border/60">
              <span className="text-xl shrink-0">{b.icon}</span>
              <div>
                <p className="text-sm font-semibold text-om-text">{b.label}</p>
                <p className="text-xs text-om-muted leading-snug">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Preço + CTA */}
        <div className="flex items-center gap-5 flex-wrap">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-display font-bold text-3xl text-yellow-400">R$9,90</span>
              <span className="text-om-muted text-sm">/mês</span>
            </div>
            <p className="text-xs text-om-muted">Cancele quando quiser</p>
          </div>

          <button
            onClick={handleSubscribe}
            disabled={subscribing || !user || loading}
            className="tv-focusable flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm
                       bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400
                       text-om-bg transition-all duration-150 active:scale-95 disabled:opacity-60 shadow-lg shadow-yellow-500/25"
          >
            {subscribing ? (
              <><span className="w-4 h-4 rounded-full border-2 border-om-bg border-t-transparent animate-spin" /> Redirecionando…</>
            ) : (
              <><span>👑</span> {!user ? "Crie uma conta para assinar" : "Assinar VIP agora"}</>
            )}
          </button>
        </div>

        {!user && (
          <p className="text-xs text-om-muted">* Necessário criar uma conta gratuita para assinar.</p>
        )}
      </div>
    </div>
  );
}
