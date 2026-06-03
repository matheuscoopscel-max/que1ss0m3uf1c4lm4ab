// FILE: frontend/src/components/admin/AdminTables.jsx
// Tabelas de gestão: Usuários, Posts e Itens da Loja.

import { useState } from "react";
import { useAdminData } from "../../hooks/useAdmin";
import { api } from "../../lib/api";
import { toastSuccess, toastError } from "../ui/Toast";

// ── Usuários ──────────────────────────────────────────────────────────────────
export function UsersTable() {
  const { data, loading, refetch } = useAdminData("/admin/users");
  const [search, setSearch] = useState("");

  const users = (data?.users ?? []).filter((u) =>
    !search || u.email.includes(search) || u.username.includes(search)
  );

  async function toggleBan(user) {
    const res = await api.patch(`/admin/users/${user.id}`, { isActive: !user.is_active });
    if (res.ok) { toastSuccess(user.is_active ? "Usuário banido." : "Usuário reativado."); refetch(); }
    else toastError("Erro ao atualizar usuário.");
  }

  async function toggleAdmin(user) {
    const res = await api.patch(`/admin/users/${user.id}`, { isAdmin: !user.is_admin });
    if (res.ok) { toastSuccess("Permissão de admin atualizada."); refetch(); }
    else { const d = await res.json(); toastError(d.message ?? "Erro."); }
  }

  return (
    <div className="space-y-4">
      <input type="search" placeholder="Buscar por email ou username…" value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm bg-om-surface border border-om-border rounded-xl px-4 py-2.5 text-sm text-om-text outline-none focus:border-om-accent/60 transition-colors" />

      {loading ? <div className="skeleton h-48 rounded-2xl" /> : (
        <div className="bg-om-card border border-om-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-om-border">
                  {["Username", "Email", "Status", "Admin", "Cadastro", "Ações"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-mono font-semibold text-om-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-om-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-om-surface/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-om-text">@{u.username}</td>
                    <td className="px-4 py-3 text-om-muted font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-[10px] ${u.is_active ? "bg-om-safe/15 text-om-safe border border-om-safe/20" : "bg-om-danger/15 text-om-danger border border-om-danger/20"}`}>
                        {u.is_active ? "ativo" : "banido"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_admin && <span className="badge bg-om-accent/15 text-om-accent border border-om-accent/20 text-[10px]">admin</span>}
                    </td>
                    <td className="px-4 py-3 text-om-muted text-xs font-mono">
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => toggleBan(u)}
                          className={`tv-focusable px-2 py-1 rounded-lg text-xs border transition-colors ${
                            u.is_active
                              ? "border-om-danger/30 text-om-danger hover:bg-om-danger/10"
                              : "border-om-safe/30 text-om-safe hover:bg-om-safe/10"
                          }`}>
                          {u.is_active ? "Banir" : "Reativar"}
                        </button>
                        <button onClick={() => toggleAdmin(u)}
                          className="tv-focusable px-2 py-1 rounded-lg text-xs border border-om-border text-om-muted hover:text-om-text transition-colors">
                          {u.is_admin ? "Revogar admin" : "Tornar admin"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && <p className="text-center text-om-muted text-sm py-8">Nenhum usuário encontrado.</p>}
        </div>
      )}
    </div>
  );
}

// ── Posts / Moderação ─────────────────────────────────────────────────────────
export function PostsModeration() {
  const { data, loading, refetch } = useAdminData("/admin/posts");

  async function hidePost(id) {
    const res = await api.delete(`/admin/posts/${id}`);
    if (res.ok) { toastSuccess("Post ocultado."); refetch(); }
    else toastError("Erro ao ocultar post.");
  }

  return (
    <div className="space-y-3">
      {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />) :
        (data?.posts ?? []).map((post) => (
          <div key={post.id} className="flex items-start gap-3 p-4 bg-om-card border border-om-border rounded-2xl">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-om-accent">@{post.username}</span>
                <span className="text-[11px] text-om-muted font-mono">
                  {new Date(post.created_at).toLocaleString("pt-BR")}
                </span>
                {post.is_hidden && <span className="badge bg-om-danger/15 text-om-danger text-[10px]">oculto</span>}
              </div>
              <p className="text-sm text-om-text line-clamp-2">{post.content}</p>
              <p className="text-[11px] text-om-muted mt-1">👍 {post.likes_count} · 💬 {post.comments_count}</p>
            </div>
            {!post.is_hidden && (
              <button onClick={() => hidePost(post.id)}
                className="tv-focusable shrink-0 px-3 py-1.5 rounded-xl border border-om-danger/30 text-om-danger text-xs hover:bg-om-danger/10 transition-colors">
                Ocultar
              </button>
            )}
          </div>
        ))
      }
      {!loading && (data?.posts ?? []).length === 0 && (
        <p className="text-center text-om-muted text-sm py-8">Nenhum post para moderar.</p>
      )}
    </div>
  );
}

// ── Loja ──────────────────────────────────────────────────────────────────────
export function ShopManager() {
  const { data, loading, refetch } = useAdminData("/admin/shop/items");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", type: "avatar_frame", priceCoins: 0, description: "", cssClass: "", isAvailable: true, isLimited: false });

  async function handleCreate() {
    const res = await api.post("/admin/shop/items", form);
    if (res.ok) { toastSuccess("Item criado."); setCreating(false); refetch(); }
    else { const d = await res.json(); toastError(d.message ?? "Erro."); }
  }

  async function toggleAvailable(item) {
    const res = await api.patch(`/admin/shop/items/${item.id}`, { isAvailable: !item.is_available });
    if (res.ok) refetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setCreating((v) => !v)}
          className="tv-focusable px-4 py-2 rounded-xl bg-om-accent hover:bg-om-accent-dim text-white text-xs font-semibold transition-all">
          + Novo item
        </button>
      </div>

      {creating && (
        <div className="bg-om-card border border-om-border rounded-2xl p-5 space-y-3 animate-fade-in">
          <h3 className="font-display font-semibold text-om-text text-sm">Novo item da loja</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[["name","Nome","text"],["priceCoins","Preço (OmniCoins)","number"],["description","Descrição","text"],["cssClass","CSS class do efeito","text"]].map(([k,ph,t]) => (
              <input key={k} type={t} placeholder={ph} value={form[k]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: t === "number" ? parseInt(e.target.value) || 0 : e.target.value }))}
                className="bg-om-surface border border-om-border rounded-xl px-4 py-2.5 text-sm text-om-text outline-none focus:border-om-accent/60" />
            ))}
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="bg-om-surface border border-om-border rounded-xl px-4 py-2.5 text-sm text-om-text outline-none focus:border-om-accent/60">
              {["avatar_frame","banner","badge","title_decoration"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setCreating(false)} className="tv-focusable px-3 py-2 rounded-xl text-xs text-om-muted border border-om-border">Cancelar</button>
            <button onClick={handleCreate} className="tv-focusable px-4 py-2 rounded-xl bg-om-accent text-white text-xs font-semibold">Criar</button>
          </div>
        </div>
      )}

      {loading ? <div className="skeleton h-48 rounded-2xl" /> : (
        <div className="bg-om-card border border-om-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-om-border">
                  {["Nome", "Tipo", "Preço 🪙", "Status", "Ações"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-mono font-semibold text-om-muted uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-om-border">
                {(data?.items ?? []).map((item) => (
                  <tr key={item.id} className="hover:bg-om-surface/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-om-text">{item.name}</td>
                    <td className="px-4 py-3 text-xs font-mono text-om-muted">{item.type}</td>
                    <td className="px-4 py-3 text-om-accent font-mono font-bold">{item.price_coins}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-[10px] ${item.is_available ? "bg-om-safe/15 text-om-safe border-om-safe/20" : "bg-om-muted/15 text-om-muted border-om-border"}`}>
                        {item.is_available ? "disponível" : "oculto"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleAvailable(item)}
                        className={`tv-focusable px-2 py-1 rounded-lg text-xs border transition-colors ${
                          item.is_available ? "border-om-muted/30 text-om-muted hover:bg-om-surface" : "border-om-safe/30 text-om-safe hover:bg-om-safe/10"
                        }`}>
                        {item.is_available ? "Ocultar" : "Ativar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tickets de Suporte (Admin) ────────────────────────────────────────────────
export function SupportTicketsAdmin() {
  const { data, loading, refetch } = useAdminData("/support/admin/tickets");
  const [replyForm, setReplyForm] = useState(null); // { id, reply, status }

  const STATUS_CONFIG = {
    open:        { label: "Aberto",     color: "text-sky-400"    },
    in_progress: { label: "Em análise", color: "text-yellow-400" },
    resolved:    { label: "Resolvido",  color: "text-om-safe"    },
    closed:      { label: "Encerrado",  color: "text-om-muted"   },
  };

  async function handleReply() {
    if (!replyForm?.reply?.trim()) return;
    const res = await api.patch(`/support/admin/tickets/${replyForm.id}`, {
      reply: replyForm.reply, status: replyForm.status,
    });
    if (res.ok) { toastSuccess("Resposta enviada."); setReplyForm(null); refetch(); }
    else toastError("Erro ao responder.");
  }

  if (loading) return <div className="skeleton h-48 rounded-2xl" />;

  return (
    <div className="space-y-3">
      {(data?.tickets ?? []).length === 0 && (
        <p className="text-center text-om-muted text-sm py-8">Nenhum ticket ainda.</p>
      )}
      {(data?.tickets ?? []).map((t) => {
        const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.open;
        return (
          <div key={t.id} className="bg-om-card border border-om-border rounded-2xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-om-text">{t.subject}</p>
                  <span className={`text-[10px] font-mono ${cfg.color}`}>{cfg.label}</span>
                </div>
                <p className="text-xs text-om-muted">{t.username ?? t.guest_email ?? "anônimo"} · {t.category}</p>
              </div>
              <button onClick={() => setReplyForm({ id: t.id, reply: t.admin_reply ?? "", status: "resolved" })}
                className="tv-focusable px-3 py-1.5 rounded-xl border border-om-border text-xs text-om-muted hover:text-om-text transition-colors shrink-0">
                Responder
              </button>
            </div>
            <p className="text-sm text-om-text leading-relaxed bg-om-surface rounded-xl p-3">{t.message}</p>

            {replyForm?.id === t.id && (
              <div className="space-y-2 animate-fade-in">
                <select value={replyForm.status}
                  onChange={(e) => setReplyForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full bg-om-surface border border-om-border rounded-xl px-3 py-2 text-sm text-om-text outline-none">
                  {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                </select>
                <textarea value={replyForm.reply}
                  onChange={(e) => setReplyForm((f) => ({ ...f, reply: e.target.value }))}
                  rows={3} placeholder="Sua resposta..."
                  className="w-full bg-om-surface border border-om-border rounded-xl px-3 py-2 text-sm text-om-text outline-none resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => setReplyForm(null)}
                    className="tv-focusable px-3 py-1.5 rounded-xl text-xs text-om-muted border border-om-border">Cancelar</button>
                  <button onClick={handleReply}
                    className="tv-focusable px-4 py-1.5 rounded-xl bg-om-accent text-white text-xs font-semibold">Enviar resposta</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
