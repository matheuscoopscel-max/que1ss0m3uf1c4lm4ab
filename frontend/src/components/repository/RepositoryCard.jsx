// FILE: frontend/src/components/repository/RepositoryCard.jsx
// Card de um repositório adicionado — mostra nome, URL, contagem de plugins,
// status de fetch e botões de atualizar/remover.

import { useOmniStore } from "../../lib/store";
import { Icon } from "../../lib/icons.jsx";

/**
 * @param {{ repo: import('../../lib/repositoryLoader').Repository }} props
 */
export function RepositoryCard({ repo }) {
  const refreshRepository = useOmniStore((s) => s.refreshRepository);
  const removeRepository  = useOmniStore((s) => s.removeRepository);
  const settings          = useOmniStore((s) => s.settings);

  const isDefault = repo.url === "/community-repo/index.json";
  const isLoading = repo.status === "loading";

  const visiblePlugins = (repo.plugins ?? []).filter((p) =>
    settings.restrictedContentEnabled ? true : p.contentRating !== "restricted"
  );

  const statusColor = {
    idle:    "text-om-muted",
    loading: "text-om-accent",
    success: "text-om-safe",
    error:   "text-om-danger",
  }[repo.status] ?? "text-om-muted";

  const statusLabel = {
    idle:    "Não carregado",
    loading: "Carregando…",
    success: `${visiblePlugins.length} plugin${visiblePlugins.length !== 1 ? "s" : ""}`,
    error:   "Erro",
  }[repo.status] ?? "";

  return (
    <div className="bg-om-card border border-om-border rounded-xl p-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-display font-semibold text-sm text-om-text truncate">
              {repo.name || repo.url}
            </h3>
            {isDefault && (
              <span className="badge bg-om-accent/15 text-om-accent border border-om-accent/20 text-[10px]">
                oficial
              </span>
            )}
          </div>

          {repo.description && (
            <p className="text-xs text-om-muted leading-relaxed mb-2 line-clamp-1">
              {repo.description}
            </p>
          )}

          <p className="text-[11px] font-mono text-om-muted/70 truncate mb-2">
            {repo.url}
          </p>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono font-medium ${statusColor}`}>
              {isLoading && (
                <span className="inline-block w-3 h-3 rounded-full border border-om-accent border-t-transparent animate-spin mr-1 align-middle" />
              )}
              {statusLabel}
            </span>

            {repo.error && (
              <span className="text-[11px] text-om-danger truncate max-w-[200px]">
                {repo.error}
              </span>
            )}

            {repo.lastFetched > 0 && repo.status === "success" && (
              <span className="text-[11px] text-om-muted/60 font-mono">
                atualizado {new Date(repo.lastFetched).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => refreshRepository(repo.url)}
            disabled={isLoading}
            className="tv-focusable w-8 h-8 rounded-lg hover:bg-om-surface flex items-center justify-center transition-colors disabled:opacity-40"
            title="Atualizar repositório"
          >
            <Icon
              name="flash"
              size={14}
              style={{ filter: "brightness(0) invert(0.6)" }}
              className={isLoading ? "animate-spin" : ""}
            />
          </button>

          {!isDefault && (
            <button
              onClick={() => removeRepository(repo.url)}
              className="tv-focusable w-8 h-8 rounded-lg hover:bg-om-danger/10 flex items-center justify-center transition-colors"
              title="Remover repositório"
            >
              <Icon
                name="delete"
                size={14}
                style={{ filter: "brightness(0) saturate(100%) invert(40%) sepia(90%) saturate(600%) hue-rotate(330deg)" }}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
