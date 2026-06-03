// FILE: frontend/src/components/library/ContentCard.jsx — Patch #13
// Adicionado: LibraryStatusButton no hover, badge de progresso.

import { Icon } from "../../lib/icons.jsx";
import { LibraryStatusButton } from "./LibraryStatusButton";
import { useLibraryStatus } from "../../hooks/useLibraryStatus";

const MEDIA_TYPE_LABELS = {
  "image-series": { iconName: "imageReader", label: "Quadrinhos" },
  ebook:          { iconName: "ebook",       label: "E-Book"     },
  "video-stream": { iconName: "videoPlay",   label: "Vídeo"      },
};

export function ContentCard({ item, onClick }) {
  const media = MEDIA_TYPE_LABELS[item.mediaType] ?? { iconName: "library", label: item.mediaType };

  const { progress, total, isFavorite } = useLibraryStatus({
    pluginSlug:    item.pluginSlug,
    itemId:        item.id,
    itemTitle:     item.title,
    itemCoverUrl:  item.coverUrl,
    itemMediaType: item.mediaType,
    repositoryUrl: item.repositoryUrl ?? "",
  });

  return (
    <article
      onClick={onClick}
      className="tv-card group relative cursor-pointer rounded-xl overflow-hidden
                 bg-om-card border border-om-border
                 hover:border-om-accent/50 hover:scale-[1.02]
                 transition-all duration-200 animate-fade-in"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      role="button"
      aria-label={`Abrir ${item.title}`}
    >
      {/* Capa */}
      <div className="relative aspect-[3/4] bg-om-surface overflow-hidden">
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={`Capa de ${item.title}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-om-muted">
            <Icon name={media.iconName ?? "library"} size={36} className="opacity-40" style={{ filter: "brightness(0) invert(1)" }} />
            <span className="text-xs font-mono">{media.label}</span>
          </div>
        )}

        {/* Overlay gradiente */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />

        {/* Badge tipo de mídia */}
        <span className="absolute top-2 left-2 badge bg-black/60 text-white/80 backdrop-blur-sm border border-white/10 text-[10px]">
          <Icon name={media.iconName ?? "library"} size={10} style={{ filter: "brightness(0) invert(0.8)" }} /> {media.label}
        </span>

        {/* Badge favorito */}
        {isFavorite && (
          <span className="absolute top-2 right-2 text-red-400 text-sm drop-shadow">❤️</span>
        )}

        {/* LibraryStatusButton — aparece no hover */}
        <div
          className="absolute bottom-8 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <LibraryStatusButton item={item} />
        </div>

        {/* Título */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="tv-card-title font-display font-semibold text-sm text-white leading-tight line-clamp-2">
            {item.title}
          </p>
        </div>
      </div>

      {/* Barra de progresso (se tiver progresso salvo) */}
      {progress !== null && total !== null && total > 0 && (
        <div className="px-3 pt-2 pb-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-om-muted font-mono">
              Cap. {progress} / {total}
            </span>
            <span className="text-[10px] text-om-accent font-mono">
              {Math.round((progress / total) * 100)}%
            </span>
          </div>
          <div className="h-0.5 bg-om-border rounded-full overflow-hidden">
            <div
              className="h-full bg-om-accent rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (progress / total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      {(!progress || total === null) && item.tags && item.tags.length > 0 && (
        <div className="px-3 py-2 flex gap-1 flex-wrap">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="badge bg-om-surface text-om-muted border border-om-border text-[10px]">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
