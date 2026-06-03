// FILE: frontend/src/pages/LibraryPage.jsx — Patch #13
// Adicionado: abas de status (Descobrir, Lendo, Salvos, Favoritos, Concluídos, Largados).

import { useState, useCallback, useEffect } from "react";
import { useOmniStore } from "../lib/store";
import { useSearch } from "../hooks/useSearch";
import { useLibraryBrowse } from "../hooks/useLibraryBrowse";
import { ContentCard } from "../components/library/ContentCard";
import { SearchBar } from "../components/library/SearchBar";
import { ContentDetailPage } from "./ContentDetailPage";
import { ImageReader } from "../components/reader/ImageReader";
import { VideoPlayer } from "../components/player/VideoPlayer";
import { Icon } from "../lib/icons.jsx";
import { HeroBanner } from "../components/ui/HeroBanner";
import { ScrollCarousel, CarouselItem } from "../components/ui/ScrollCarousel";
import { ContentCardV2 } from "../components/library/ContentCardV2";

// ── Configuração das abas ─────────────────────────────────────────────────────
const STATUS_TABS = [
  { id: "discover",  label: "Descobrir",  icon: "search"     },
  { id: "reading",   label: "Lendo",      icon: "ebook"      },
  { id: "watching",  label: "Assistindo", icon: "videoPlay"  },
  { id: "saved",     label: "Salvos",     icon: "bookmark"   },
  { id: "favorite",  label: "Favoritos",  icon: "badge"      },
  { id: "completed", label: "Concluídos", icon: "checklist"  },
  { id: "dropped",   label: "Largados",   icon: "delete"     },
];

const MEDIA_FILTERS = [
  { id: "all",           label: "Todos" },
  { id: "image-series",  label: "🖼 Quadrinhos" },
  { id: "ebook",         label: "📖 E-Books" },
  { id: "video-stream",  label: "📺 Vídeo" },
];

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="tv-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden">
          <div className="skeleton aspect-[3/4]" />
          <div className="p-2"><div className="skeleton h-3 w-3/4" /></div>
        </div>
      ))}
    </div>
  );
}

// ── Aba Descobrir (browse + busca) ────────────────────────────────────────────
function DiscoverTab({ installedPlugins, openDetail }) {
  const { state: searchState, search, clear } = useSearch();
  const [mediaFilter, setMediaFilter] = useState("all");

  const pluginsKey = installedPlugins.map((p) => p.slug).join(",");
  const browseState = useLibraryBrowse(pluginsKey);

  const isSearching = searchState.query.length > 0;
  const items = isSearching ? searchState.results : browseState.items;
  const loading = isSearching ? searchState.loading : browseState.loading;

  const filtered = mediaFilter === "all" ? items : items.filter((i) => i.mediaType === mediaFilter);
  const handleSearch = useCallback((q) => (q.trim() ? search(q) : clear()), [search, clear]);

  // Separa primeiros itens para o hero, restantes para os carrosséis
  const heroItems   = items.slice(0, 5);
  const mangaItems  = items.filter((i) => i.mediaType === "image-series").slice(0, 20);
  const videoItems  = items.filter((i) => i.mediaType === "video-stream").slice(0, 20);
  const ebookItems  = items.filter((i) => i.mediaType === "ebook").slice(0, 20);

  const showHero = !isSearching && heroItems.length > 0;

  return (
    <div className="space-y-8">
      {/* Busca */}
      <SearchBar onSearch={handleSearch} loading={loading} />

      {/* Filtros só quando buscando */}
      {isSearching && (
        <div className="flex items-center gap-1 bg-om-surface border border-om-border rounded-xl p-1 w-fit">
          {MEDIA_FILTERS.map((f) => (
            <button key={f.id} onClick={() => setMediaFilter(f.id)}
              className={`tv-focusable px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                mediaFilter === f.id ? "bg-om-accent text-white" : "text-om-muted hover:text-om-text"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Hero Banner */}
      {showHero && !loading && (
        <HeroBanner
          items={heroItems}
          onRead={(item) => openDetail(item)}
          onDetails={(item) => openDetail(item)}
        />
      )}

      {/* Conteúdo de busca */}
      {isSearching && (
        loading && filtered.length === 0 ? <SkeletonGrid /> : filtered.length > 0 ? (
          <div>
            <p className="text-xs text-om-muted font-mono mb-3">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para <span className="text-om-text">"{searchState.query}"</span>
            </p>
            <div className="tv-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filtered.map((item, idx) => (
                <ContentCardV2 key={`${item.pluginSlug}-${item.id}-${idx}`} item={item} onClick={() => openDetail(item)} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <Icon name="search" size={48} className="mb-3 mx-auto block opacity-20" style={{ filter: "brightness(0) invert(1)" }} />
            <p className="text-om-muted text-sm">Nenhum resultado para "{searchState.query}".</p>
          </div>
        )
      )}

      {/* Carrosséis por tipo (modo browse) */}
      {!isSearching && !loading && (
        <>
          {mangaItems.length > 0 && (
            <ScrollCarousel title="🖼 Quadrinhos & Mangás">
              {mangaItems.map((item, idx) => (
                <CarouselItem key={`${item.pluginSlug}-${item.id}-${idx}`}>
                  <ContentCardV2 item={item} onClick={() => openDetail(item)} variant="compact" />
                </CarouselItem>
              ))}
            </ScrollCarousel>
          )}

          {videoItems.length > 0 && (
            <ScrollCarousel title="📺 Streaming de Vídeo">
              {videoItems.map((item, idx) => (
                <CarouselItem key={`${item.pluginSlug}-${item.id}-${idx}`}>
                  <ContentCardV2 item={item} onClick={() => openDetail(item)} variant="compact" />
                </CarouselItem>
              ))}
            </ScrollCarousel>
          )}

          {ebookItems.length > 0 && (
            <ScrollCarousel title="📖 E-Books">
              {ebookItems.map((item, idx) => (
                <CarouselItem key={`${item.pluginSlug}-${item.id}-${idx}`}>
                  <ContentCardV2 item={item} onClick={() => openDetail(item)} variant="compact" />
                </CarouselItem>
              ))}
            </ScrollCarousel>
          )}

          {/* Grid completo abaixo */}
          {items.length > 0 && (
            <section>
              <h2 className="font-display font-bold text-lg text-om-text mb-3">Todos os títulos</h2>
              <div className="tv-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {items.map((item, idx) => (
                  <ContentCardV2 key={`${item.pluginSlug}-${item.id}-${idx}`} item={item} onClick={() => openDetail(item)} />
                ))}
              </div>
            </section>
          )}

          {loading && items.length === 0 && <SkeletonGrid />}
        </>
      )}
    </div>
  );
}

// ── Aba de Status (Lendo, Salvos, etc.) ───────────────────────────────────────
function StatusTab({ statusFilter, openDetail }) {
  const localLibrary = useOmniStore((s) => s.localLibrary);

  // Filtra itens locais pelo status
  const items = Object.values(localLibrary).filter((item) => {
    if (statusFilter === "favorite") return item.isFavorite;
    return item.status === statusFilter;
  });

  if (items.length === 0) {
    const tab = STATUS_TABS.find((t) => t.id === statusFilter);
    return (
      <div className="text-center py-16">
        <Icon name={tab?.icon ?? "library"} size={48} className="mb-3 mx-auto block opacity-20" style={{ filter: "brightness(0) invert(1)" }} />
        <p className="text-om-muted text-sm">Nenhum item em <strong>{tab?.label}</strong> ainda.</p>
        <p className="text-xs text-om-muted mt-1">Navegue pelos títulos na aba Descobrir e adicione à sua biblioteca.</p>
      </div>
    );
  }

  return (
    <div className="tv-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {items.map((item, idx) => {
        // Reconstrói um CatalogItem a partir dos dados salvos
        const catalogItem = {
          id:         item.itemId,
          title:      item.itemTitle ?? item.itemId,
          coverUrl:   item.itemCoverUrl,
          mediaType:  item.itemMediaType,
          pluginSlug: item.pluginSlug,
          repositoryUrl: item.repositoryUrl,
          tags:       [],
        };
        return (
          <ContentCard key={`${item.pluginSlug}-${item.itemId}-${idx}`} item={catalogItem} onClick={() => openDetail(catalogItem)} />
        );
      })}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function LibraryPage() {
  const installedPlugins = useOmniStore((s) => s.installedPlugins);
  const setActiveTab     = useOmniStore((s) => s.setActiveTab);
  const libraryView      = useOmniStore((s) => s.libraryView);
  const selectedItem     = useOmniStore((s) => s.selectedItem);
  const selectedChapter  = useOmniStore((s) => s.selectedChapter);
  const openDetail       = useOmniStore((s) => s.openDetail);
  const openChapter      = useOmniStore((s) => s.openChapter);
  const backToGrid       = useOmniStore((s) => s.backToGrid);
  const backToDetail     = useOmniStore((s) => s.backToDetail);
  const localLibrary     = useOmniStore((s) => s.localLibrary);

  const [statusTab, setStatusTab] = useState("discover");

  // Roteamento para leitor/player
  if (libraryView === "reader" && selectedItem && selectedChapter) {
    return <ImageReader item={selectedItem} chapter={selectedChapter} onClose={backToDetail} />;
  }
  if (libraryView === "player" && selectedItem && selectedChapter) {
    return <VideoPlayer item={selectedItem} chapter={selectedChapter} onClose={backToDetail} />;
  }
  if (libraryView === "detail" && selectedItem) {
    return (
      <ContentDetailPage
        item={selectedItem}
        onBack={backToGrid}
        onOpenChapter={(_details, chapter) => openChapter(chapter)}
      />
    );
  }

  // Empty state — nenhum plugin instalado
  if (installedPlugins.length === 0) {
    return <LibraryEmptyState onNavigate={() => setActiveTab("extensions")} />;
  }

  // Contagem de itens por status para badges
  const counts = {};
  Object.values(localLibrary).forEach((item) => {
    if (item.status) counts[item.status] = (counts[item.status] ?? 0) + 1;
    if (item.isFavorite) counts.favorite = (counts.favorite ?? 0) + 1;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-om-text">Biblioteca</h1>
        <p className="text-om-muted text-sm mt-0.5">
          {installedPlugins.length} extensão{installedPlugins.length !== 1 ? "ões" : ""} ativa{installedPlugins.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Abas de status */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_TABS.map(({ id, label, icon }) => {
          const count = id !== "discover" ? (counts[id] ?? 0) : null;
          const isActive = statusTab === id;
          return (
            <button
              key={id}
              onClick={() => setStatusTab(id)}
              className={`tv-focusable relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 border ${
                isActive
                  ? "bg-om-accent/15 text-om-accent border-om-accent/30"
                  : "text-om-muted hover:text-om-text border-om-border hover:border-om-accent/20 bg-om-surface"
              }`}
            >
              <Icon name={icon} size={13} style={{ filter: isActive
                ? "brightness(0) saturate(100%) invert(58%) sepia(75%) saturate(570%) hue-rotate(346deg)"
                : "brightness(0) invert(0.6)" }}
              />
              {label}
              {count !== null && count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  isActive ? "bg-om-accent text-white" : "bg-om-border text-om-muted"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Conteúdo da aba */}
      {statusTab === "discover" ? (
        <DiscoverTab installedPlugins={installedPlugins} openDetail={openDetail} />
      ) : (
        <StatusTab statusFilter={statusTab} openDetail={openDetail} />
      )}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function LibraryEmptyState({ onNavigate }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in">
      <div className="relative mb-8">
        <div className="w-28 h-28 rounded-3xl bg-om-surface border border-om-border flex items-center justify-center">
          <Icon name="library" size={56} className="opacity-40" style={{ filter: "brightness(0) invert(1)" }} />
        </div>
        <div className="absolute inset-0 rounded-3xl bg-om-accent/5 blur-xl -z-10" />
      </div>
      <h2 className="font-display font-bold text-2xl text-om-text mb-2">Biblioteca vazia</h2>
      <p className="text-om-muted text-sm max-w-sm leading-relaxed mb-8">
        Instale extensões da comunidade para começar a acessar quadrinhos, e-books e streams de vídeo.
      </p>
      <button onClick={onNavigate}
        className="tv-focusable flex items-center gap-2 bg-om-accent hover:bg-om-accent-dim text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all duration-150 active:scale-95 animate-pulse-glow">
        <Icon name="install" size={16} style={{ filter: "brightness(0) invert(1)" }} />
        Instalar Extensões
      </button>
      <div className="mt-12 flex flex-col sm:flex-row items-center gap-6 text-xs text-om-muted">
        {[
          { icon: "lock", label: "100% agnóstico", desc: "Sem mídias no código-fonte" },
          { icon: "extensions", label: "Modular", desc: "Plugins da comunidade" },
          { icon: "monitorSettings", label: "Multiplataforma", desc: "Desktop · Mobile · TV" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <Icon name={item.icon} size={14} style={{ filter: "brightness(0) invert(0.5)" }} />
            <div className="text-left">
              <span className="text-om-text font-medium">{item.label}</span>
              <span> — {item.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
