// FILE: frontend/src/pages/ExtensionsPage.jsx — Patch #31
// Somente leitura: lista as fontes de conteúdo já ativadas pelo admin.
// Curadoria (adicionar repositório, ativar/desativar plugin) mudou pro
// Painel Admin → Conteúdo (ver ContentSourcesManager).

import { useOmniStore } from "../lib/store";
import { PluginCard } from "../components/extensions/PluginCard";
import { Icon } from "../lib/icons.jsx";

const CATEGORIES = [
  { id: "all",    label: "Todos" },
  { id: "comics", label: "Quadrinhos" },
  { id: "ebooks", label: "E-Books" },
  { id: "video",  label: "Vídeo" },
];

function SkeletonCard() {
  return (
    <div className="bg-om-card border border-om-border rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="skeleton w-10 h-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-3 w-1/4" />
        </div>
        <div className="skeleton h-7 w-20 rounded-lg" />
      </div>
      <div className="skeleton h-3 w-full mb-2" />
      <div className="skeleton h-3 w-5/6" />
    </div>
  );
}

export function ExtensionsPage() {
  const installedPlugins = useOmniStore((s) => s.installedPlugins);
  const settings          = useOmniStore((s) => s.settings);
  const updateSettings    = useOmniStore((s) => s.updateSettings);
  const search            = useOmniStore((s) => s.catalogSearch);
  const setSearch         = useOmniStore((s) => s.setCatalogSearch);
  const categoryFilter    = useOmniStore((s) => s.catalogCategoryFilter);
  const setCategoryFilter = useOmniStore((s) => s.setCatalogCategoryFilter);

  const visible = installedPlugins
    .filter((p) => settings.restrictedContentEnabled ? true : p.contentRating !== "restricted")
    .filter((p) => categoryFilter === "all" || p.category === categoryFilter)
    .filter((p) => !search || `${p.name} ${p.description} ${(p.tags ?? []).join(" ")}`
      .toLowerCase().includes(search.toLowerCase()));

  const isLoading = installedPlugins.length === 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-om-text">Extensões</h1>
          <p className="text-om-muted text-sm mt-1">
            Fontes de conteúdo ativas nesta plataforma — curadoria feita pela administração.
          </p>
        </div>

        {/* Toggle restrito */}
        <button
          onClick={() => updateSettings({ restrictedContentEnabled: !settings.restrictedContentEnabled })}
          className={`tv-focusable flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
            settings.restrictedContentEnabled
              ? "border-red-500/50 bg-red-500/10 text-red-400"
              : "border-om-border bg-om-surface text-om-muted hover:border-om-accent/40"
          }`}
        >
          <Icon
            name={settings.restrictedContentEnabled ? "unlock" : "lock"}
            size={14}
            style={{ filter: settings.restrictedContentEnabled
              ? "brightness(0) saturate(100%) invert(40%) sepia(90%) saturate(600%) hue-rotate(330deg)"
              : "brightness(0) invert(1) opacity(0.6)" }}
          />
          <span>Conteúdo <strong>{settings.restrictedContentEnabled ? "Irrestrito" : "Filtrado"}</strong></span>
        </button>
      </div>

      {/* Alerta restrito */}
      {settings.restrictedContentEnabled && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 animate-fade-in">
          <Icon name="warning" size={18} className="shrink-0 mt-0.5" style={{ filter: "brightness(0) saturate(100%) invert(40%) sepia(90%) saturate(600%) hue-rotate(330deg)" }} />
          <p className="text-red-300 text-sm leading-relaxed">
            <strong>Filtro de conteúdo desativado.</strong> Certifique-se de ter 18 anos ou mais.
          </p>
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Icon name="search" size={16} style={{ filter: "brightness(0) invert(1) opacity(0.4)" }} />
        </span>
        <input
          type="text"
          placeholder="Buscar extensões…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-om-surface border border-om-border rounded-xl pl-9 pr-4 py-2.5
                     text-sm text-om-text placeholder:text-om-muted outline-none
                     focus:border-om-accent/60 transition-colors"
        />
      </div>

      {/* Filtro por categoria */}
      <div className="flex items-center gap-1 bg-om-surface border border-om-border rounded-xl p-1 w-fit">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`tv-focusable px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              categoryFilter === cat.id ? "bg-om-accent text-white" : "text-om-muted hover:text-om-text"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : visible.map((plugin) => (
              <PluginCard key={`${plugin.repositoryUrl}-${plugin.slug}`} plugin={plugin} />
            ))
        }
      </div>

      {/* Vazio */}
      {!isLoading && visible.length === 0 && (
        <div className="text-center py-16">
          <Icon name="extensions" size={48} className="mb-3 opacity-20 mx-auto block" style={{ filter: "brightness(0) invert(1)" }} />
          <p className="text-om-muted text-sm">
            {search ? `Nenhuma extensão encontrada para "${search}".` : "Nenhuma extensão ativa no momento."}
          </p>
        </div>
      )}
    </div>
  );
}
