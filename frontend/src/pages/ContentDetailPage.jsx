// FILE: frontend/src/pages/ContentDetailPage.jsx
// Tela de detalhes de um CatalogItem.
// Busca MediaDetails via plugin.getDetails(id) e exibe capa, sinopse e lista de capítulos.
// Navegação para o leitor/player será implementada nos Patches #4 e #5.

import { useState, useEffect } from "react";
import { getPlugin } from "../lib/pluginRegistry";
import { useOmniStore } from "../lib/store";
import { Icon } from "../lib/icons.jsx";

const MEDIA_TYPE_LABELS = {
  "image-series": "Capítulos",
  ebook: "Volumes",
  "video-stream": "Episódios",
};

/**
 * @param {{
 *   item: import('../types/plugin').CatalogItem,
 *   onBack: () => void,
 *   onOpenChapter: (details: import('../types/plugin').MediaDetails, chapter: import('../types/plugin').Chapter) => void
 * }} props
 */
export function ContentDetailPage({ item, onBack, onOpenChapter }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const setActiveTab = useOmniStore((s) => s.setActiveTab);

  useEffect(() => {
    const plugin = getPlugin(item.pluginSlug);
    if (!plugin) {
      setError(`Plugin "${item.pluginSlug}" não está carregado.`);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    plugin
      .getDetails(item.id)
      .then((d) => {
        setDetails(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? "Erro ao carregar detalhes.");
        setLoading(false);
      });
  }, [item.id, item.pluginSlug]);

  const chapterLabel = MEDIA_TYPE_LABELS[item.mediaType] ?? "Itens";

  return (
    <div className="animate-fade-in">
      {/* Botão voltar */}
      <button
        onClick={onBack}
        className="tv-focusable flex items-center gap-2 text-om-muted hover:text-om-text text-sm mb-6 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Voltar à biblioteca
      </button>

      {loading && <DetailSkeleton />}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-om-danger/10 border border-om-danger/30">
          <Icon name="warning" size={20} style={{ filter: "brightness(0) saturate(100%) invert(40%) sepia(90%) saturate(600%) hue-rotate(330deg)" }} />
          <p className="text-sm text-om-danger">{error}</p>
        </div>
      )}

      {details && !loading && (
        <div className="space-y-8">
          {/* Hero: capa + info principal */}
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Capa */}
            <div className="shrink-0 w-40 sm:w-48 rounded-xl overflow-hidden bg-om-surface border border-om-border self-start">
              {details.coverUrl ? (
                <img src={details.coverUrl} alt={details.title} className="w-full aspect-[3/4] object-cover" />
              ) : (
                <div className="w-full aspect-[3/4] flex items-center justify-center text-om-muted">
                  <Icon name="library" size={48} style={{ filter: "brightness(0) invert(1) opacity(0.3)" }} />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div>
                <span className="badge bg-om-accent/15 text-om-accent border border-om-accent/20 mb-2 inline-flex">
                  {item.pluginSlug}
                </span>
                <h1 className="font-display font-bold text-2xl text-om-text leading-tight">
                  {details.title}
                </h1>
                {details.authors?.length > 0 && (
                  <p className="text-sm text-om-muted mt-1">
                    por <span className="text-om-text">{details.authors.join(", ")}</span>
                  </p>
                )}
              </div>

              {details.description && (
                <p className="text-sm text-om-muted leading-relaxed max-w-prose">
                  {details.description}
                </p>
              )}

              {details.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {details.tags.map((tag) => (
                    <span key={tag} className="badge bg-om-surface text-om-muted border border-om-border">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 pt-1 text-xs text-om-muted font-mono">
                {details.chapters && (
                  <span>{details.chapters.length} {chapterLabel.toLowerCase()}</span>
                )}
                {details.lastUpdated && (
                  <span>atualizado {new Date(details.lastUpdated).toLocaleDateString("pt-BR")}</span>
                )}
              </div>
            </div>
          </div>

          {/* Lista de capítulos/episódios */}
          {details.chapters && details.chapters.length > 0 && (
            <section>
              <h2 className="font-display font-semibold text-base text-om-text mb-3">
                {chapterLabel}
                <span className="ml-2 text-sm font-normal text-om-muted font-mono">
                  ({details.chapters.length})
                </span>
              </h2>

              <div className="space-y-1 max-h-[28rem] overflow-y-auto pr-1">
                {details.chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => onOpenChapter(details, chapter)}
                    className="tv-focusable w-full flex items-center justify-between px-4 py-3
                               rounded-xl bg-om-card border border-om-border
                               hover:border-om-accent/50 hover:bg-om-accent/5
                               transition-all duration-150 text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-om-muted font-mono text-xs w-8 text-right shrink-0">
                        {chapter.number ?? "—"}
                      </span>
                      <span className="text-sm text-om-text group-hover:text-om-accent transition-colors">
                        {chapter.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {chapter.releaseDate && (
                        <span className="text-xs text-om-muted font-mono hidden sm:inline">
                          {new Date(chapter.releaseDate).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      <svg
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
                        className="w-4 h-4 text-om-muted group-hover:text-om-accent transition-colors"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Para streams sem episódios (video direto) */}
          {item.mediaType === "video-stream" && (!details.chapters || details.chapters.length === 0) && (
            <button
              onClick={() => onOpenChapter(details, { id: "main", title: "Assistir", number: 1 })}
              className="tv-focusable flex items-center justify-center gap-2 w-full sm:w-auto
                         px-8 py-3 bg-om-accent hover:bg-om-accent-dim text-white
                         font-semibold rounded-xl transition-all duration-150 active:scale-95"
            >
              <Icon name="videoPlay" size={18} style={{ filter: "brightness(0) invert(1)" }} />
              Assistir agora
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex gap-6">
        <div className="skeleton w-48 aspect-[3/4] rounded-xl shrink-0" />
        <div className="flex-1 space-y-3 pt-1">
          <div className="skeleton h-6 w-3/4" />
          <div className="skeleton h-4 w-1/4" />
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-5/6" />
          <div className="skeleton h-3 w-4/5" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-12 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
