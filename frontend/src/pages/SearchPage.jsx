// FILE: frontend/src/pages/SearchPage.jsx
// Página de busca dedicada com filtros avançados, sugestões em tempo real
// e resultados agrupados por plugin de origem.

import { useState, useCallback, useEffect } from "react";
import { useOmniStore } from "../lib/store";
import { useSearch } from "../hooks/useSearch";
import { useSearchFilters } from "../hooks/useSearchFilters";
import { SearchSuggestions } from "../components/search/SearchSuggestions";
import { FilterPanel } from "../components/search/FilterPanel";
import { ContentCardV2 } from "../components/library/ContentCardV2";
import { Icon } from "../lib/icons.jsx";

// Sorteia os resultados localmente de acordo com o filtro de ordenação
function sortItems(items, sort) {
  switch (sort) {
    case "az":
      return [...items].sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    case "popular":
      // Sem dados de popularidade nos mocks — usa contagem de tags como proxy
      return [...items].sort((a, b) => (b.tags?.length ?? 0) - (a.tags?.length ?? 0));
    case "recent":
      return [...items].sort((a, b) =>
        new Date(b.lastUpdated ?? 0) - new Date(a.lastUpdated ?? 0)
      );
    default:
      return items;
  }
}

// Aplica filtros de tipo, gênero, status e plugin
function applyFilters(items, filters) {
  return items.filter((item) => {
    if (filters.type !== "all" && item.mediaType !== filters.type) return false;
    if (filters.pluginSlug !== "all" && item.pluginSlug !== filters.pluginSlug) return false;
    if (filters.genre !== "all") {
      const tags = (item.tags ?? []).map((t) =>
        t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, "-")
      );
      if (!tags.includes(filters.genre)) return false;
    }
    return true;
  });
}

// Agrupa resultados por pluginSlug
function groupByPlugin(items) {
  const groups = {};
  items.forEach((item) => {
    const slug = item.pluginSlug ?? "unknown";
    if (!groups[slug]) groups[slug] = [];
    groups[slug].push(item);
  });
  return groups;
}

export function SearchPage() {
  const installedPlugins = useOmniStore((s) => s.installedPlugins);
  const openDetail       = useOmniStore((s) => s.openDetail);

  const { state: searchState, search, clear } = useSearch();
  const { filters, setFilter, setQuery, resetFilters, hasActiveFilters, activeCount } = useSearchFilters();

  const [inputValue, setInputValue] = useState(filters.query);
  const [groupResults, setGroupResults] = useState(false);

  // Dispara busca inicial se URL tiver query
  useEffect(() => {
    if (filters.query) search(filters.query);
  }, []);

  const handleSearch = useCallback((q) => {
    setQuery(q);
    setInputValue(q);
    if (q.trim()) search(q);
    else clear();
  }, [search, clear, setQuery]);

  const handleSelect = useCallback((item) => {
    openDetail(item);
  }, [openDetail]);

  // Aplica filtros e ordenação localmente sobre os resultados da busca
  const filtered = applyFilters(searchState.results, filters);
  const sorted   = sortItems(filtered, filters.sort);
  const groups   = groupResults ? groupByPlugin(sorted) : null;

  const hasResults  = sorted.length > 0;
  const hasSearched = searchState.query.length > 0;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-om-text">Busca</h1>
        <p className="text-om-muted text-sm mt-0.5">
          Pesquise em todas as extensões instaladas simultaneamente.
        </p>
      </div>

      {/* Barra de busca com autocomplete */}
      <SearchSuggestions
        value={inputValue}
        onChange={setInputValue}
        onSelect={handleSelect}
        onSearch={handleSearch}
        loading={searchState.loading}
        placeholder="Buscar mangás, animes, e-books…"
      />

      {/* Filtros */}
      <div className="flex items-start gap-3 flex-wrap">
        <FilterPanel
          filters={filters}
          onSetFilter={setFilter}
          onReset={resetFilters}
          activeCount={activeCount}
          installedPlugins={installedPlugins}
        />

        {hasResults && (
          <button
            onClick={() => setGroupResults((v) => !v)}
            className={`tv-focusable flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
              groupResults
                ? "border-om-accent/40 bg-om-accent/10 text-om-accent"
                : "border-om-border bg-om-surface text-om-muted hover:text-om-text"
            }`}
          >
            <Icon name="sortAsc" size={13} style={{ filter: groupResults
              ? "brightness(0) saturate(100%) invert(58%) sepia(75%) saturate(570%) hue-rotate(346deg)"
              : "brightness(0) invert(0.6)" }} />
            Agrupar por plugin
          </button>
        )}
      </div>

      {/* Estado: sem busca ainda */}
      {!hasSearched && (
        <div className="text-center py-20">
          <Icon name="search" size={64} className="mx-auto block mb-4 opacity-10" style={{ filter: "brightness(0) invert(1)" }} />
          <p className="text-om-muted text-base">Digite algo para buscar</p>
          <p className="text-om-muted/60 text-sm mt-1">
            {installedPlugins.length > 0
              ? `Buscará em ${installedPlugins.length} extensão${installedPlugins.length !== 1 ? "ões" : ""} instalada${installedPlugins.length !== 1 ? "s" : ""}`
              : "Instale extensões para começar a buscar"}
          </p>

          {/* Sugestões de gêneros populares */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {["ação", "romance", "fantasia", "sci-fi", "mistério", "comédia"].map((genre) => (
              <button
                key={genre}
                onClick={() => handleSearch(genre)}
                className="tv-focusable px-3 py-1.5 rounded-full bg-om-surface border border-om-border text-xs text-om-muted hover:text-om-text hover:border-om-accent/30 transition-all"
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Estado: loading */}
      {hasSearched && searchState.loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden">
              <div className="skeleton aspect-[3/4]" />
              <div className="p-2"><div className="skeleton h-3 w-3/4" /></div>
            </div>
          ))}
        </div>
      )}

      {/* Estado: sem resultados */}
      {hasSearched && !searchState.loading && !hasResults && (
        <div className="text-center py-16">
          <Icon name="filterOff" size={48} className="mx-auto block mb-3 opacity-20" style={{ filter: "brightness(0) invert(1)" }} />
          <p className="text-om-muted text-sm">
            Nenhum resultado para <strong className="text-om-text">"{searchState.query}"</strong>
            {hasActiveFilters && " com os filtros ativos"}.
          </p>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="mt-2 text-xs text-om-accent hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Resultados */}
      {hasSearched && !searchState.loading && hasResults && (
        <div className="space-y-3">
          {/* Contador + URL hint */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-om-muted font-mono">
              {sorted.length} resultado{sorted.length !== 1 ? "s" : ""} para{" "}
              <span className="text-om-text">"{searchState.query}"</span>
              {filtered.length < searchState.results.length && (
                <span className="text-om-muted/60"> ({searchState.results.length - filtered.length} filtrado{searchState.results.length - filtered.length !== 1 ? "s" : ""})</span>
              )}
            </p>
            <p className="text-[11px] text-om-muted/50 font-mono hidden sm:block">
              URL atualizada ✓
            </p>
          </div>

          {/* Grid agrupado */}
          {groupResults && groups ? (
            <div className="space-y-8">
              {Object.entries(groups).map(([slug, items]) => (
                <section key={slug}>
                  <h3 className="font-display font-semibold text-base text-om-text mb-3 flex items-center gap-2">
                    <span className="badge bg-om-accent/15 text-om-accent border border-om-accent/20 font-mono text-[11px]">
                      {slug}
                    </span>
                    <span className="text-sm text-om-muted font-normal">
                      {items.length} resultado{items.length !== 1 ? "s" : ""}
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 stagger-grid">
                    {items.map((item, idx) => (
                      <ContentCardV2
                        key={`${item.pluginSlug}-${item.id}-${idx}`}
                        item={item}
                        onClick={() => openDetail(item)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            // Grid plano
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 stagger-grid">
              {sorted.map((item, idx) => (
                <ContentCardV2
                  key={`${item.pluginSlug}-${item.id}-${idx}`}
                  item={item}
                  onClick={() => openDetail(item)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
