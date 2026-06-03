// FILE: frontend/src/components/profile/ActivityFeed.jsx
// Feed de atividade recente: "começou a ler X", "assistiu Y", etc.

const STATUS_VERB = {
  reading:   "está lendo",
  watching:  "está assistindo",
  completed: "concluiu",
  saved:     "salvou",
  dropped:   "largou",
};

const MEDIA_EMOJI = {
  "image-series": "🖼",
  "ebook":        "📖",
  "video-stream": "📺",
};

/**
 * @param {{ activity: any[], username: string }} props
 */
export function ActivityFeed({ activity, username }) {
  if (!activity || activity.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-om-muted text-sm">Nenhuma atividade recente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activity.map((item, i) => {
        const verb  = STATUS_VERB[item.status] ?? "atualizou";
        const emoji = MEDIA_EMOJI[item.itemMediaType] ?? "📄";
        const when  = formatRelativeTime(item.updatedAt);

        return (
          <div
            key={`${item.pluginSlug}-${item.itemId}-${i}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-om-surface border border-om-border hover:border-om-accent/20 transition-colors animate-fade-in"
          >
            {/* Capa mini */}
            <div className="shrink-0 w-10 h-12 rounded-lg overflow-hidden bg-om-card border border-om-border">
              {item.itemCoverUrl ? (
                <img src={item.itemCoverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg">{emoji}</div>
              )}
            </div>

            {/* Texto */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-om-text leading-snug">
                <span className="font-medium text-om-accent">{username}</span>
                {" "}<span className="text-om-muted">{verb}</span>{" "}
                <span className="font-medium truncate">{item.itemTitle ?? item.itemId}</span>
              </p>
              {item.currentChapterTitle && (
                <p className="text-xs text-om-muted mt-0.5 truncate">
                  {item.currentChapterTitle}
                  {item.currentChapterNum ? ` (#${item.currentChapterNum})` : ""}
                </p>
              )}
            </div>

            {/* Tempo */}
            <span className="text-[11px] text-om-muted/60 font-mono shrink-0">{when}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (mins  < 1)   return "agora";
  if (mins  < 60)  return `${mins}m`;
  if (hours < 24)  return `${hours}h`;
  if (days  < 30)  return `${days}d`;
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
