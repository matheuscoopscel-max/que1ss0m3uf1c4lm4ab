// FILE: frontend/src/components/admin/ContentSourcesManager.jsx
// Painel admin de curadoria de fontes de conteúdo: repositórios (index.json) e
// ativação de plugins por slug. Substitui o antigo fluxo onde qualquer usuário
// podia adicionar repositório / instalar plugin — agora é decisão só do admin.
// Um plugin listado num repositório aprovado só fica visível na plataforma
// depois de ativado explicitamente aqui.

import { useState, useEffect, useCallback } from "react";
import { useAdminData } from "../../hooks/useAdmin";
import { api } from "../../lib/api";
import { toastSuccess, toastError } from "../ui/Toast";
import { fetchRepository } from "../../lib/repositoryLoader";

// ── Repositórios ──────────────────────────────────────────────────────────────
function RepositoriesSection() {
  const { data, loading, refetch } = useAdminData("/admin/repositories");
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setAdding(true);
    const res = await api.post("/admin/repositories", { url: trimmed });
    setAdding(false);
    if (res.ok) { toastSuccess("Repositório adicionado."); setUrl(""); refetch(); }
    else { const d = await res.json(); toastError(d.message ?? "Erro ao adicionar repositório."); }
  }

  async function toggleActive(repo) {
    const res = await api.patch(`/admin/repositories/${repo.id}`, { isActive: !repo.is_active });
    if (res.ok) { refetch(); } else { toastError("Falha ao atualizar repositório."); }
  }

  async function handleRemove(repo) {
    const res = await api.delete(`/admin/repositories/${repo.id}`);
    if (res.ok) { toastSuccess("Repositório removido."); refetch(); }
    else { toastError("Falha ao remover repositório."); }
  }

  return (
    <div className="space-y-3">
      <div className="bg-om-card border border-om-border rounded-2xl p-4 space-y-3">
        <h3 className="font-display font-semibold text-om-text text-sm">Adicionar repositório</h3>
        <p className="text-xs text-om-muted">
          URL de um <code className="font-mono text-om-accent">index.json</code> — só aparece na plataforma
          depois que você ativar os plugins específicos abaixo.
        </p>
        <div className="flex gap-2">
          <input
            type="text" placeholder="https://.../index.json" value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 bg-om-surface border border-om-border rounded-xl px-4 py-2.5 text-sm text-om-text outline-none focus:border-om-accent/60"
          />
          <button onClick={handleAdd} disabled={adding || !url.trim()}
            className="tv-focusable px-4 py-2 rounded-xl bg-om-accent hover:bg-om-accent-dim text-white text-xs font-semibold transition-all disabled:opacity-40">
            {adding ? "Adicionando…" : "Adicionar"}
          </button>
        </div>
      </div>

      {loading ? <div className="skeleton h-32 rounded-2xl" /> : (
        <div className="space-y-2">
          {(data?.repositories ?? []).map((repo) => (
            <div key={repo.id} className="bg-om-card border border-om-border rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="font-display font-semibold text-sm text-om-text truncate">{repo.name || repo.url}</h4>
                  <span className={`badge text-[10px] ${repo.is_active ? "bg-om-safe/15 text-om-safe border-om-safe/20" : "bg-om-muted/15 text-om-muted border-om-border"}`}>
                    {repo.is_active ? "ativo" : "inativo"}
                  </span>
                </div>
                {repo.description && <p className="text-xs text-om-muted mb-1 line-clamp-1">{repo.description}</p>}
                <p className="text-[11px] font-mono text-om-muted/70 truncate">{repo.url}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleActive(repo)}
                  className={`tv-focusable px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                    repo.is_active ? "border-om-muted/30 text-om-muted hover:bg-om-surface" : "border-om-safe/30 text-om-safe hover:bg-om-safe/10"
                  }`}>
                  {repo.is_active ? "Desativar" : "Ativar"}
                </button>
                <button onClick={() => handleRemove(repo)}
                  className="tv-focusable px-2.5 py-1.5 rounded-lg text-xs border border-om-danger/30 text-om-danger hover:bg-om-danger/10 transition-colors">
                  Remover
                </button>
              </div>
            </div>
          ))}
          {(data?.repositories ?? []).length === 0 && (
            <p className="text-center text-xs text-om-muted py-6">Nenhum repositório cadastrado ainda.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Ativação de plugins ────────────────────────────────────────────────────────
function PluginsSection() {
  const { data: activationsData, loading: loadingActivations, refetch: refetchActivations } = useAdminData("/admin/plugins");
  const { data: reposData, loading: loadingRepos } = useAdminData("/admin/repositories");

  const [catalog, setCatalog] = useState([]); // plugins descobertos nos repositórios ativos
  const [catalogLoading, setCatalogLoading] = useState(false);

  const loadCatalog = useCallback(async () => {
    const activeRepos = (reposData?.repositories ?? []).filter((r) => r.is_active);
    if (activeRepos.length === 0) { setCatalog([]); return; }
    setCatalogLoading(true);
    const results = await Promise.all(activeRepos.map((r) => fetchRepository(r.url)));
    setCatalog(results.flatMap((r) => r.status === "success" ? r.plugins : []));
    setCatalogLoading(false);
  }, [reposData]);

  useEffect(() => { if (reposData) loadCatalog(); }, [reposData, loadCatalog]);

  const activationBySlug = Object.fromEntries(
    (activationsData?.plugins ?? []).map((p) => [p.slug, p])
  );

  async function toggleActive(plugin) {
    const current = activationBySlug[plugin.slug];
    const nextActive = !(current?.is_active ?? false);
    const res = await api.patch(`/admin/plugins/${plugin.slug}`, {
      isActive:  nextActive,
      name:      plugin.name,
      sourceUrl: plugin.repositoryUrl,
    });
    if (res.ok) { toastSuccess(`"${plugin.name}" ${nextActive ? "ativado" : "desativado"} pra plataforma inteira.`); refetchActivations(); }
    else { toastError("Falha ao atualizar ativação do plugin."); }
  }

  const loading = loadingActivations || loadingRepos || catalogLoading;

  return (
    <div className="space-y-3">
      <div className="bg-om-surface border border-om-border rounded-xl p-4 text-xs text-om-muted leading-relaxed">
        Plugins listados aqui vêm dos repositórios ativos. Ativar um plugin o torna visível
        <strong className="text-om-text"> para todos os usuários da plataforma</strong> — não é mais uma escolha individual.
      </div>

      {loading ? <div className="skeleton h-48 rounded-2xl" /> : (
        <div className="bg-om-card border border-om-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-om-border">
                  {["Plugin", "Categoria", "Classificação", "Status", "Ação"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-mono font-semibold text-om-muted uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-om-border">
                {catalog.map((plugin) => {
                  const activation = activationBySlug[plugin.slug];
                  const isActive = activation?.is_active ?? false;
                  return (
                    <tr key={`${plugin.repositoryUrl}-${plugin.slug}`} className="hover:bg-om-surface/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-om-text">{plugin.name}</p>
                        <p className="text-[11px] font-mono text-om-muted/70">{plugin.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-om-muted">{plugin.category}</td>
                      <td className="px-4 py-3">
                        <span className={`badge text-[10px] ${plugin.contentRating === "restricted" ? "bg-red-500/15 text-red-400 border-red-500/20" : "bg-om-border text-om-muted"}`}>
                          {plugin.contentRating === "restricted" ? "+18" : "geral"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge text-[10px] ${isActive ? "bg-om-safe/15 text-om-safe border-om-safe/20" : "bg-om-muted/15 text-om-muted border-om-border"}`}>
                          {isActive ? "ativo" : "inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive(plugin)}
                          className={`tv-focusable px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                            isActive ? "border-om-muted/30 text-om-muted hover:bg-om-surface" : "border-om-safe/30 text-om-safe hover:bg-om-safe/10"
                          }`}>
                          {isActive ? "Desativar" : "Ativar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {catalog.length === 0 && (
            <p className="text-center text-xs text-om-muted py-8">
              Nenhum plugin encontrado — ative um repositório acima primeiro.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Página composta ─────────────────────────────────────────────────────────
export function ContentSourcesManager() {
  const [tab, setTab] = useState("plugins");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 bg-om-surface border border-om-border rounded-xl p-1 w-fit">
        {[["plugins", "Plugins"], ["repositories", "Repositórios"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`tv-focusable px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              tab === id ? "bg-om-accent text-white" : "text-om-muted hover:text-om-text"
            }`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "plugins" ? <PluginsSection /> : <RepositoriesSection />}
    </div>
  );
}
