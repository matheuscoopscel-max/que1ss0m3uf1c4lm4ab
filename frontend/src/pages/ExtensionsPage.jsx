// FILE: frontend/src/pages/ExtensionsPage.jsx — Patch #11
// Reescrita: plugins vêm de repositórios externos (não mais do /api/plugins).
// Duas sub-abas: Plugins (instalar) | Repositórios (gerenciar fontes).

import { useEffect, useState } from "react";
import { useOmniStore } from "../lib/store";
import { PluginCard } from "../components/extensions/PluginCard";
import { RepositoryCard } from "../components/repository/RepositoryCard";
import { AddRepositoryForm } from "../components/repository/AddRepositoryForm";
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

// ── Sub-aba: Plugins ──────────────────────────────────────────────────────────
function PluginsTab() {
  const repositories            = useOmniStore((s) => s.repositories);
  const getAllRepositoryPlugins  = useOmniStore((s) => s.getAllRepositoryPlugins);
  const refreshAllRepositories  = useOmniStore((s) => s.refreshAllRepositories);
  const settings                = useOmniStore((s) => s.settings);
  const updateSettings          = useOmniStore((s) => s.updateSettings);
  const search                  = useOmniStore((s) => s.catalogSearch);
  const setSearch               = useOmniStore((s) => s.setCatalogSearch);
  const categoryFilter          = useOmniStore((s) => s.catalogCategoryFilter);
  const setCategoryFilter       = useOmniStore((s) => s.setCatalogCategoryFilter);
  const activeRepoFilter        = useOmniStore((s) => s.activeRepositoryFilter);
  const setActiveRepoFilter     = useOmniStore((s) => s.setActiveRepositoryFilter);

  const isLoading = repositories.some((r) => r.status === "loading");
  const hasError  = repositories.every((r) => r.status === "error");

  // Carrega todos os repositórios na montagem
  useEffect(() => {
    const anyNeedsLoad = repositories.some(
      (r) => r.status === "idle" || r.plugins.length === 0
    );
    if (anyNeedsLoad) refreshAllRepositories();
  }, []);

  // Filtragem local
  const allPlugins = getAllRepositoryPlugins();
  const filtered = allPlugins.filter((p) => {
    const matchCat  = categoryFilter === "all" || p.category === categoryFilter;
    const matchRepo = activeRepoFilter === "all" || p.repositoryUrl === activeRepoFilter;
    const matchQ    = !search || `${p.name} ${p.description} ${p.tags.join(" ")}`
      .toLowerCase().includes(search.toLowerCase());
    return matchCat && matchRepo && matchQ;
  });

  const successRepos = repositories.filter((r) => r.status === "success" && r.plugins.length > 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-om-muted text-sm">
            {allPlugins.length} plugin{allPlugins.length !== 1 ? "s" : ""} disponíve{allPlugins.length !== 1 ? "is" : "l"} em {repositories.filter(r => r.status === "success").length} repositório{repositories.filter(r => r.status === "success").length !== 1 ? "s" : ""}
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
          placeholder="Buscar plugins…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-om-surface border border-om-border rounded-xl pl-9 pr-4 py-2.5
                     text-sm text-om-text placeholder:text-om-muted outline-none
                     focus:border-om-accent/60 transition-colors"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {/* Por categoria */}
        <div className="flex items-center gap-1 bg-om-surface border border-om-border rounded-xl p-1">
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

        {/* Por repositório (só aparece se tiver mais de 1) */}
        {successRepos.length > 1 && (
          <div className="flex items-center gap-1 bg-om-surface border border-om-border rounded-xl p-1">
            <button
              onClick={() => setActiveRepoFilter("all")}
              className={`tv-focusable px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                activeRepoFilter === "all" ? "bg-om-accent/20 text-om-accent" : "text-om-muted hover:text-om-text"
              }`}
            >
              Todos os repos
            </button>
            {successRepos.map((r) => (
              <button
                key={r.url}
                onClick={() => setActiveRepoFilter(r.url)}
                className={`tv-focusable px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 truncate max-w-[140px] ${
                  activeRepoFilter === r.url ? "bg-om-accent/20 text-om-accent" : "text-om-muted hover:text-om-text"
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Erro geral */}
      {hasError && !isLoading && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-om-danger/10 border border-om-danger/30">
          <Icon name="warning" size={18} style={{ filter: "brightness(0) saturate(100%) invert(40%) sepia(90%) saturate(600%) hue-rotate(330deg)" }} />
          <div className="flex-1">
            <p className="text-sm font-medium text-om-danger">Falha ao carregar repositórios</p>
            <p className="text-xs text-om-muted mt-0.5">Verifique as URLs na aba Repositórios.</p>
          </div>
          <button onClick={refreshAllRepositories} className="text-xs text-om-accent hover:underline">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading && filtered.length === 0
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.map((plugin) => (
              <PluginCard key={`${plugin.repositoryUrl}-${plugin.slug}`} plugin={plugin} />
            ))
        }
      </div>

      {/* Vazio */}
      {!isLoading && filtered.length === 0 && !hasError && (
        <div className="text-center py-16">
          <Icon name="extensions" size={48} className="mb-3 opacity-20 mx-auto block" style={{ filter: "brightness(0) invert(1)" }} />
          <p className="text-om-muted text-sm">
            {search ? `Nenhum plugin encontrado para "${search}".` : "Nenhum plugin disponível nos repositórios."}
          </p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-om-muted text-center font-mono">
          {filtered.length} plugin{filtered.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

// ── Sub-aba: Repositórios ─────────────────────────────────────────────────────
function RepositoriesTab() {
  const repositories           = useOmniStore((s) => s.repositories);
  const refreshAllRepositories = useOmniStore((s) => s.refreshAllRepositories);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-om-muted text-sm">
            {repositories.length} repositório{repositories.length !== 1 ? "s" : ""} configurado{repositories.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={refreshAllRepositories}
          className="tv-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                     text-xs font-medium text-om-muted hover:text-om-text
                     hover:bg-om-surface border border-om-border transition-all"
        >
          <Icon name="flash" size={12} style={{ filter: "brightness(0) invert(0.6)" }} />
          Atualizar todos
        </button>
      </div>

      {/* Info sobre o modelo */}
      <div className="p-4 rounded-xl bg-om-surface border border-om-border text-sm text-om-muted leading-relaxed">
        <p className="font-medium text-om-text mb-1">Como funcionam os repositórios</p>
        Os plugins são hospedados pela comunidade em repositórios independentes (GitHub, etc).
        O OmniMedia apenas carrega o <code className="font-mono text-om-accent text-xs">index.json</code> da
        URL que você adicionar — nenhum dado passa pelo servidor OmniMedia.
      </div>

      {/* Formulário de adicionar */}
      <AddRepositoryForm />

      {/* Lista de repositórios */}
      <div className="space-y-2">
        {repositories.map((repo) => (
          <RepositoryCard key={repo.url} repo={repo} />
        ))}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function ExtensionsPage() {
  const [activeSubTab, setActiveSubTab] = useState("plugins");

  const SUB_TABS = [
    { id: "plugins",      label: "Plugins",       icon: "extensions" },
    { id: "repositories", label: "Repositórios",  icon: "browser-edit" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-om-text">Extensões</h1>
        <p className="text-om-muted text-sm mt-1">
          Plugins da comunidade via repositórios externos.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 bg-om-surface border border-om-border rounded-xl p-1 w-fit">
        {SUB_TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveSubTab(id)}
            className={`tv-focusable flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              activeSubTab === id
                ? "bg-om-accent text-white"
                : "text-om-muted hover:text-om-text"
            }`}
          >
            <Icon
              name={icon}
              size={14}
              style={{ filter: activeSubTab === id ? "brightness(0) invert(1)" : "brightness(0) invert(0.6)" }}
            />
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {activeSubTab === "plugins"      && <PluginsTab />}
      {activeSubTab === "repositories" && <RepositoriesTab />}
    </div>
  );
}
