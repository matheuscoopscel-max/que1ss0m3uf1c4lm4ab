// FILE: frontend/src/pages/CategoryPage.jsx
// Browse por categoria/gênero com grid paginado.
// Recebe o gênero via prop ou lê da URL (?genre=acao).

import { useState, useEffect, useCallback } from "react";
import { useOmniStore } from "../lib/store";
import { useSearch } from "../hooks/useSearch";
import { ContentCardV2 } from "../components/library/ContentCardV2";
import { Icon } from "../lib/icons.jsx";

const GENRES = [
  { slug: "acao",         label: "Ação",         emoji: "⚔️"  },
  { slug: "aventura",     label: "Aventura",      emoji: "🗺️"  },
  { slug: "comedia",      label: "Comédia",       emoji: "😂"  },
  { slug: "drama",        label: "Drama",         emoji: "🎭"  },
  { slug: "fantasia",     label: "Fantasia",      emoji: "🧙"  },
  { slug: "horror",       label: "Horror",        emoji: "👻"  },
  { slug: "misterio",     label: "Mistério",      emoji: "🔍"  },
  { slug: "romance",      label: "Romance",       emoji: "💕"  },
  { slug: "sci-fi",       label: "Sci-Fi",        emoji: "🚀"  },
  { slug: "slice-of-life",label: "Slice of Life", emoji: "🌸"  },
  { slug: "sobrenatural", label: "Sobrenatural",  emoji: "✨"  },
  { slug: "esportes",     label: "Esportes",      emoji: "⚽"  },
  { slug: "historico",    label: "Histórico",     emoji: "📜"  },
  { slug: "psicologico",  label: "Psicológico",   emoji: "🧠"  },
  { slug: "thriller",     label: "Thriller",      emoji: "😰"  },
  { slug: "ecchi",        label: "Ecchi",         emoji: "🔞"  },
];

const PAGE_SIZE = 24;

export function CategoryPage() {
  const openDetail = useOmniStore((s) => s.openDetail);
  const { state: searchState, search } = useSearch();

  // Lê gênero da URL
  const [activeGenre, setActiveGenre] = useState(() => {
    return new URLSearchParams(window.location.search).get("genre") ?? null;
  });
  const [page, setPage] = useState(1);

  const genre = GENRES.find((g) => g.slug === activeGenre);

  // Busca por gênero quando seleciona — passa o SLUG diretamente ao plugin
  // O plugin MangaDex v1.1.0 detecta slugs de gênero e usa a Tag API
  useEffect(() => {
    if (activeGenre) {
      search(activeGenre); // ex: "acao", "romance" — plugin converte para tag MangaDex
      const params = new URLSearchParams();
      params.set("genre", activeGenre);
      window.history.replaceState(null, "", `?${params.toString()}`);
    }
  }, [activeGenre]);

  // Sem filtro adicional — o plugin já retornou apenas itens do gênero
  const filtered = searchState.results;

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore   = filtered.length > paginated.length;

  function selectGenre(slug) {
    setActiveGenre(slug);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-om-text">Categorias</h1>
        <p className="text-om-muted text-sm mt-0.5">Explore por gênero e estilo.</p>
      </div>

      {/* Grid de categorias */}
      {!activeGenre && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 stagger-grid">
          {GENRES.map((g) => (
            <button
              key={g.slug}
              onClick={() => selectGenre(g.slug)}
              className="tv-focusable group flex flex-col items-center justify-center gap-2
                         aspect-square rounded-2xl border border-om-border bg-om-card
                         hover:border-om-accent/50 hover:bg-om-accent/5 hover:scale-[1.02]
                         transition-all duration-200 animate-fade-in"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform duration-200">
                {g.emoji}
              </span>
              <span className="text-sm font-semibold text-om-text group-hover:text-om-accent transition-colors">
                {g.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Conteúdo do gênero selecionado */}
      {activeGenre && (
        <div className="space-y-4 animate-fade-in">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveGenre(null); window.history.replaceState(null, "", window.location.pathname); }}
              className="tv-focusable flex items-center gap-1 text-sm text-om-muted hover:text-om-text transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Categorias
            </button>
            <span className="text-om-muted/40">/</span>
            <span className="text-sm font-semibold text-om-text flex items-center gap-1">
              <span>{genre?.emoji}</span>
              {genre?.label ?? activeGenre}
            </span>
            {filtered.length > 0 && (
              <span className="text-xs text-om-muted font-mono">({filtered.length} títulos)</span>
            )}
          </div>

          {/* Loading */}
          {searchState.loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden">
                  <div className="skeleton aspect-[3/4]" />
                </div>
              ))}
            </div>
          )}

          {/* Resultados */}
          {!searchState.loading && filtered.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 stagger-grid">
                {paginated.map((item, idx) => (
                  <ContentCardV2
                    key={`${item.pluginSlug}-${item.id}-${idx}`}
                    item={item}
                    onClick={() => openDetail(item)}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    className="tv-focusable px-6 py-3 rounded-xl border border-om-border bg-om-surface
                               text-sm text-om-muted hover:text-om-text hover:border-om-accent/30 transition-all"
                  >
                    Carregar mais ({filtered.length - paginated.length} restantes)
                  </button>
                </div>
              )}
            </>
          )}

          {/* Vazio */}
          {!searchState.loading && filtered.length === 0 && (
            <div className="text-center py-16">
              <span className="text-5xl">{genre?.emoji ?? "🔍"}</span>
              <p className="text-om-muted text-sm mt-3">
                Nenhum título com o gênero <strong>{genre?.label}</strong> nos plugins instalados.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
