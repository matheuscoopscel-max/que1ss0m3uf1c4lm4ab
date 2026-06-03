// FILE: frontend/src/components/extensions/PluginCard.jsx — Patch #2
// Adicionado: feedback via toast ao instalar/remover, PluginStatusBadge,
// indicador de status de carga do plugin.

import { useOmniStore } from "../../lib/store";
import { api } from "../../lib/api";
import { Icon } from "../../lib/icons.jsx";
import { loadPlugin } from "../../lib/pluginLoader";
import { toastSuccess, toastError, toastInfo } from "../ui/Toast";
import { PluginStatusBadge } from "./PluginStatusBadge";

const CATEGORY_LABELS = {
  comics: { label: "Quadrinhos", color: "bg-violet-500/20 text-violet-300" },
  ebooks: { label: "E-Books", color: "bg-sky-500/20 text-sky-300" },
  video: { label: "Vídeo", color: "bg-emerald-500/20 text-emerald-300" },
};

const MEDIA_TYPE_ICON_NAMES = {
  "image-series": "imageReader",
  ebook:          "ebook",
  "video-stream": "videoPlay",
};

export function PluginCard({ plugin }) {
  const isInstalled = useOmniStore((s) => s.isInstalled(plugin.slug));
  const installPlugin = useOmniStore((s) => s.installPlugin);
  const uninstallPlugin = useOmniStore((s) => s.uninstallPlugin);
  const setPluginLoadStatus = useOmniStore((s) => s.setPluginLoadStatus);

  const cat = CATEGORY_LABELS[plugin.category] ?? {
    label: plugin.category,
    color: "bg-om-border text-om-muted",
  };

  const isRestricted = plugin.contentRating === "restricted";

  async function handleInstall() {
    installPlugin(plugin);
    setPluginLoadStatus(plugin.slug, "loading");

    const scriptUrl = plugin.scriptUrl.startsWith("/")
      ? plugin.scriptUrl
      : `/plugins/${plugin.slug}.js`;

    const result = await loadPlugin({
      slug: plugin.slug,
      scriptUrl,
      name: plugin.name,
    });

    if (result.success) {
      setPluginLoadStatus(plugin.slug, "loaded");
      toastSuccess(`"${plugin.name}" instalado e carregado com sucesso.`);
      // Sincroniza com a conta do usuário se estiver logado (fire-and-forget)
      api.post("/me/installations", {
        slug:          plugin.slug,
        repositoryUrl: plugin.repositoryUrl ?? "",
        name:          plugin.name,
        version:       plugin.version,
      }).catch(() => {});
    } else {
      setPluginLoadStatus(plugin.slug, "error");
      toastError(`Falha ao carregar "${plugin.name}": ${result.error}`);
    }
  }

  function handleUninstall() {
    uninstallPlugin(plugin.slug);
    toastInfo(`"${plugin.name}" removido.`);
  }

  return (
    <article className="plugin-card animate-fade-in group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-om-border flex items-center justify-center shrink-0 select-none overflow-hidden">
          {plugin.iconUrl ? (
            <img src={plugin.iconUrl} alt={plugin.name} className="w-6 h-6 object-contain" style={{ filter: "brightness(0) invert(0.7)" }} draggable={false} />
          ) : (
            <Icon name={MEDIA_TYPE_ICON_NAMES[plugin.mediaTypes[0]] ?? "extensions"} size={20} style={{ filter: "brightness(0) invert(0.7)" }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-display font-semibold text-sm text-om-text truncate">
              {plugin.name}
            </h3>
            {isRestricted && (
              <span className="badge bg-red-500/20 text-red-400 shrink-0">+18</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xs text-om-muted font-mono">v{plugin.version}</p>
            {isInstalled && <PluginStatusBadge slug={plugin.slug} />}
          </div>
        </div>

        {/* Botão instalar/remover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            isInstalled ? handleUninstall() : handleInstall();
          }}
          className={`tv-focusable shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 ${
            isInstalled
              ? "bg-om-danger/15 text-om-danger hover:bg-om-danger/25"
              : "bg-om-accent text-white hover:bg-om-accent-dim active:scale-95"
          }`}
        >
          {isInstalled ? "Remover" : "Instalar"}
        </button>
      </div>

      {/* Descrição */}
      <p className="text-xs text-om-muted leading-relaxed mb-3 line-clamp-2">
        {plugin.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`badge ${cat.color}`}>{cat.label}</span>
          {plugin.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="badge bg-om-surface text-om-muted border border-om-border">
              #{tag}
            </span>
          ))}
        </div>
        <span className="text-[11px] text-om-muted font-mono">
          ↓ {plugin.installCount.toLocaleString("pt-BR")}
        </span>
      </div>
    </article>
  );
}
