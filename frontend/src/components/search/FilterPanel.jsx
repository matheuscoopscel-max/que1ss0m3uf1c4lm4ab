// FILE: frontend/src/components/search/FilterPanel.jsx
// Painel de filtros avançados: tipo de mídia, gênero, status e ordenação.
// Colapsável com badge de contagem de filtros ativos.

import { useState } from "react";
import { Icon } from "../../lib/icons.jsx";

const GENRES = [
  "Ação", "Aventura", "Comédia", "Drama", "Fantasia", "Horror",
  "Mistério", "Romance", "Sci-Fi", "Slice of Life", "Sobrenatural",
  "Esportes", "Histórico", "Psicológico", "Thriller", "Ecchi",
];

const MEDIA_TYPES = [
  { value: "all",          label: "Todos"        },
  { value: "image-series", label: "Quadrinhos"   },
  { value: "ebook",        label: "E-Books"      },
  { value: "video-stream", label: "Vídeos"       },
];

const STATUSES = [
  { value: "all",       label: "Qualquer"   },
  { value: "ongoing",   label: "Em andamento" },
  { value: "completed", label: "Concluído"  },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevância" },
  { value: "popular",   label: "Mais popular" },
  { value: "recent",    label: "Mais recente" },
  { value: "rating",    label: "Melhor avaliado" },
  { value: "az",        label: "A → Z" },
];

/**
 * @param {{
 *   filters: import('../../hooks/useSearchFilters').SearchFilters,
 *   onSetFilter: (key: string, value: string) => void,
 *   onReset: () => void,
 *   activeCount: number,
 *   installedPlugins: any[],
 * }} props
 */
export function FilterPanel({ filters, onSetFilter, onReset, activeCount, installedPlugins }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`tv-focusable flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 ${
          activeCount > 0
            ? "border-om-accent/50 bg-om-accent/10 text-om-accent"
            : "border-om-border bg-om-surface text-om-muted hover:text-om-text hover:border-om-accent/30"
        }`}
      >
        <Icon
          name="filter"
          size={15}
          style={{ filter: activeCount > 0
            ? "brightness(0) saturate(100%) invert(58%) sepia(75%) saturate(570%) hue-rotate(346deg)"
            : "brightness(0) invert(0.6)" }}
        />
        Filtros
        {activeCount > 0 && (
          <span className="px-1.5 py-0.5 bg-om-accent text-white rounded-full text-[10px] font-mono">
            {activeCount}
          </span>
        )}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div className="bg-om-card border border-om-border rounded-2xl p-4 space-y-5 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* Tipo de mídia */}
            <FilterSection label="Tipo de mídia">
              {MEDIA_TYPES.map((t) => (
                <FilterChip
                  key={t.value}
                  label={t.label}
                  active={filters.type === t.value}
                  onClick={() => onSetFilter("type", t.value)}
                />
              ))}
            </FilterSection>

            {/* Status */}
            <FilterSection label="Status">
              {STATUSES.map((s) => (
                <FilterChip
                  key={s.value}
                  label={s.label}
                  active={filters.status === s.value}
                  onClick={() => onSetFilter("status", s.value)}
                />
              ))}
            </FilterSection>

            {/* Ordenação */}
            <FilterSection label="Ordenar por">
              {SORT_OPTIONS.map((s) => (
                <FilterChip
                  key={s.value}
                  label={s.label}
                  active={filters.sort === s.value}
                  onClick={() => onSetFilter("sort", s.value)}
                />
              ))}
            </FilterSection>

            {/* Plugin de origem */}
            {installedPlugins.length > 1 && (
              <FilterSection label="Extensão">
                <FilterChip
                  label="Todas"
                  active={filters.pluginSlug === "all"}
                  onClick={() => onSetFilter("pluginSlug", "all")}
                />
                {installedPlugins.map((p) => (
                  <FilterChip
                    key={p.slug}
                    label={p.name}
                    active={filters.pluginSlug === p.slug}
                    onClick={() => onSetFilter("pluginSlug", p.slug)}
                  />
                ))}
              </FilterSection>
            )}
          </div>

          {/* Gêneros — faixa horizontal */}
          <div>
            <p className="text-xs font-mono font-semibold text-om-muted uppercase tracking-widest mb-2">
              Gênero
            </p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                label="Todos"
                active={filters.genre === "all"}
                onClick={() => onSetFilter("genre", "all")}
              />
              {GENRES.map((g) => {
                const slug = g.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, "-");
                return (
                  <FilterChip
                    key={g}
                    label={g}
                    active={filters.genre === slug}
                    onClick={() => onSetFilter("genre", slug)}
                  />
                );
              })}
            </div>
          </div>

          {/* Reset */}
          {activeCount > 0 && (
            <div className="flex justify-end border-t border-om-border pt-3">
              <button
                onClick={onReset}
                className="tv-focusable flex items-center gap-1.5 text-xs text-om-muted hover:text-om-danger transition-colors"
              >
                <Icon name="filterOff" size={13} style={{ filter: "brightness(0) invert(0.5)" }} />
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterSection({ label, children }) {
  return (
    <div>
      <p className="text-xs font-mono font-semibold text-om-muted uppercase tracking-widest mb-2">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`tv-focusable px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-150 ${
        active
          ? "bg-om-accent/15 text-om-accent border-om-accent/30"
          : "bg-om-surface text-om-muted border-om-border hover:border-om-accent/30 hover:text-om-text"
      }`}
    >
      {label}
    </button>
  );
}
