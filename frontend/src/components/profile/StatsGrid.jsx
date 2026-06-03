// FILE: frontend/src/components/profile/StatsGrid.jsx
// Grid de cartões de estatísticas do usuário.

/**
 * @param {{ stats: import('../../hooks/useProfile').Stats | null }} props
 */
export function StatsGrid({ stats }) {
  if (!stats) return null;

  const cards = [
    {
      label: "Títulos na Biblioteca",
      value: stats.totalItems ?? 0,
      icon: "📚",
      color: "text-sky-400",
      bg:    "bg-sky-500/10 border-sky-500/20",
    },
    {
      label: "Concluídos",
      value: stats.completedItems ?? 0,
      icon: "✅",
      color: "text-emerald-400",
      bg:    "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Favoritos",
      value: stats.favoriteItems ?? 0,
      icon: "❤️",
      color: "text-red-400",
      bg:    "bg-red-500/10 border-red-500/20",
    },
    {
      label: "Capítulos Lidos",
      value: stats.totalChaptersRead ?? 0,
      icon: "📖",
      color: "text-violet-400",
      bg:    "bg-violet-500/10 border-violet-500/20",
    },
    {
      label: "Extensões Instaladas",
      value: stats.pluginsInstalled ?? 0,
      icon: "🧩",
      color: "text-om-accent",
      bg:    "bg-om-accent/10 border-om-accent/20",
    },
    {
      label: "Última Atividade",
      value: stats.lastActivity
        ? new Date(stats.lastActivity).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
        : "—",
      icon: "🕐",
      color: "text-om-muted",
      bg:    "bg-om-surface border-om-border",
      small: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border p-4 ${card.bg} animate-fade-in`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{card.icon}</span>
            <span className="text-xs text-om-muted leading-tight">{card.label}</span>
          </div>
          <p className={`font-display font-bold ${card.small ? "text-lg" : "text-2xl"} ${card.color} tabular-nums`}>
            {typeof card.value === "number" ? card.value.toLocaleString("pt-BR") : card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
