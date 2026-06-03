// FILE: frontend/src/components/library/ContentCardV2.jsx
// Card premium com hover animado: zoom na capa, overlay com sinopse,
// rating em estrelas e badge de status de leitura.
// Usado no HeroBanner, carrosséis e grid principal.

import { Icon } from "../../lib/icons.jsx";
import { RatingStars } from "../ui/RatingStars";
import { LibraryStatusButton } from "./LibraryStatusButton";
import { useLibraryStatus } from "../../hooks/useLibraryStatus";

const MEDIA_LABELS = {
  "image-series": { icon: "imageReader", label: "Quadrinhos", color: "bg-violet-500/80" },
  ebook:          { icon: "ebook",       label: "E-Book",     color: "bg-sky-500/80"    },
  "video-stream": { icon: "videoPlay",   label: "Vídeo",      color: "bg-emerald-500/80"},
};

const STATUS_COLORS = {
  reading:   "bg-sky-500/90 text-white",
  watching:  "bg-emerald-500/90 text-white",
  completed: "bg-om-safe/90 text-white",
  saved:     "bg-yellow-500/90 text-om-bg",
  dropped:   "bg-om-muted/60 text-white",
};

const STATUS_LABELS = {
  reading:   "Lendo",
  watching:  "Assistindo",
  completed: "Concluído",
  saved:     "Salvo",
  dropped:   "Largado",
};

/**
 * @param {{
 *   item: import('../../types/plugin').CatalogItem,
 *   onClick: () => void,
 *   rating?: number,
 *   ratingCount?: number,
 *   variant?: 'default' | 'compact' | 'wide'
 * }} props
 */
export function ContentCardV2({ item, onClick, rating, ratingCount, variant = "default" }) {
  const media = MEDIA_LABELS[item.mediaType] ?? { icon: "library", label: item.mediaType, color: "bg-om-accent/80" };

  const { status, isFavorite, progress, total } = useLibraryStatus({
    pluginSlug:    item.pluginSlug,
    itemId:        item.id,
    itemTitle:     item.title,
    itemCoverUrl:  item.coverUrl,
    itemMediaType: item.mediaType,
    repositoryUrl: item.repositoryUrl ?? "",
  });

  const isCompact = variant === "compact";
  const isWide    = variant === "wide";

  return (
    <article
      onClick={onClick}
      className={`tv-focusable group relative cursor-pointer rounded-xl overflow-hidden
                  bg-om-card border border-om-border
                  hover:border-om-accent/40 hover:shadow-xl hover:shadow-om-accent/10
                  transition-all duration-250 animate-fade-in
                  ${isWide ? "flex gap-3" : ""}`}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      role="button"
      aria-label={`Abrir ${item.title}`}
    >
      {/* ── Capa ─────────────────────────────────────────────────────────── */}
      <div
        className={`relative overflow-hidden bg-om-surface shrink-0
                    ${isWide ? "w-24 h-32 rounded-xl" : "aspect-[3/4]"}`}
      >
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={`Capa de ${item.title}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-om-muted">
            <Icon name={media.icon} size={isCompact ? 24 : 36} className="opacity-40"
              style={{ filter: "brightness(0) invert(1)" }} />
          </div>
        )}

        {/* Gradiente inferior */}
        {!isWide && (
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        )}

        {/* Badge tipo de mídia */}
        <span className={`absolute top-2 left-2 badge ${media.color} text-white text-[10px] font-semibold`}>
          {media.label}
        </span>

        {/* Favorito */}
        {isFavorite && (
          <span className="absolute top-2 right-2 text-sm drop-shadow">❤️</span>
        )}

        {/* Status badge */}
        {status && (
          <span className={`absolute bottom-8 left-2 badge text-[10px] font-semibold ${STATUS_COLORS[status] ?? ""}`}>
            {STATUS_LABELS[status]}
          </span>
        )}

        {/* ── Hover overlay com synopsis ───────────────────────────────── */}
        {!isWide && !isCompact && item.description && (
          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
            <p className="text-white text-[11px] leading-relaxed line-clamp-4 mb-2">
              {item.description}
            </p>
            {rating && (
              <RatingStars value={rating} size="sm" showValue count={ratingCount} />
            )}
          </div>
        )}

        {/* Badge de fonte — canto inferior direito, sempre visível */}
        {item.pluginSlug && !isWide && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-semibold bg-black/70 text-white/70 backdrop-blur-sm pointer-events-none">
            {item.pluginSlug.replace(/-reader$/, "").replace(/-plugin$/, "").slice(0, 10).toUpperCase()}
          </div>
        )}

        {/* Título sobreposto */}
        {!isWide && (
          <div className="absolute inset-x-0 bottom-0 p-3 group-hover:opacity-0 transition-opacity duration-200">
            <p className="tv-card-title font-display font-semibold text-sm text-white leading-tight line-clamp-2">
              {item.title}
            </p>
          </div>
        )}

        {/* LibraryStatusButton */}
        {!isWide && (
          <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            onClick={(e) => e.stopPropagation()}>
            <LibraryStatusButton item={item} />
          </div>
        )}
      </div>

      {/* ── Info (modo wide) ─────────────────────────────────────────────── */}
      {isWide && (
        <div className="flex-1 min-w-0 py-2 pr-3">
          <p className="font-display font-semibold text-sm text-om-text leading-tight line-clamp-2 mb-1">
            {item.title}
          </p>
          {item.pluginSlug && (
            <p className="text-[10px] text-om-accent/70 font-mono mb-1">
              {item.pluginSlug.replace(/-reader$/, "").replace(/-plugin$/, "").toUpperCase()}
            </p>
          )}
          {rating && <RatingStars value={rating} size="sm" showValue count={ratingCount} />}
          {item.description && (
            <p className="text-xs text-om-muted leading-relaxed line-clamp-3 mt-1">
              {item.description}
            </p>
          )}
          {item.tags && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {item.tags.slice(0, 2).map((t) => (
                <span key={t} className="badge bg-om-surface text-om-muted border border-om-border text-[10px]">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Barra de progresso ───────────────────────────────────────────── */}
      {progress !== null && total !== null && total > 0 && !isWide && (
        <div className="px-2 pt-1 pb-2">
          <div className="h-0.5 bg-om-border rounded-full overflow-hidden">
            <div
              className="h-full bg-om-accent rounded-full"
              style={{ width: `${Math.min(100, (progress / total) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-om-muted font-mono mt-0.5 text-right">
            {progress}/{total}
          </p>
        </div>
      )}
    </article>
  );
}
