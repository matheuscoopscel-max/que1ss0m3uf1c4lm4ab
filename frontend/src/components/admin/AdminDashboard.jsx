// FILE: frontend/src/components/admin/AdminDashboard.jsx
// Cards de estatísticas do painel admin.

import { useAdminData } from "../../hooks/useAdmin";

function StatCard({ label, value, sub, color = "text-om-accent", icon }) {
  return (
    <div className="bg-om-card border border-om-border rounded-2xl p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`font-display font-bold text-3xl tabular-nums ${color}`}>
          {value?.toLocaleString("pt-BR") ?? "—"}
        </span>
      </div>
      <p className="text-sm font-semibold text-om-text">{label}</p>
      {sub && <p className="text-xs text-om-muted mt-0.5">{sub}</p>}
    </div>
  );
}

export function AdminDashboard() {
  const { data, loading, refetch } = useAdminData("/admin/stats");
  const s = data?.stats;

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-lg text-om-text">Visão Geral</h2>
        <button onClick={refetch} className="tv-focusable text-xs text-om-accent hover:underline">
          ↻ Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard icon="👥" label="Usuários totais"     value={s?.users?.total}          sub={`${s?.users?.admins ?? 0} admins`} />
        <StatCard icon="🚫" label="Usuários banidos"    value={s?.users?.banned}         color="text-om-danger" />
        <StatCard icon="💬" label="Posts na comunidade" value={s?.posts?.total}          sub={`+${s?.posts?.today ?? 0} hoje`} />
        <StatCard icon="💳" label="Transações"          value={s?.transactions?.total}   sub={`${s?.transactions?.spent ?? 0} 🪙 gastos`} />
        <StatCard icon="🪙" label="OmniCoins circulando" value={s?.coins?.in_circulation} color="text-yellow-400" />
        <StatCard icon="👑" label="Assinaturas VIP"     value={s?.subscriptions?.active} color="text-violet-400" />
      </div>
    </div>
  );
}
