// FILE: frontend/src/components/community/NotificationPanel.jsx
// Painel de notificações estilo Twitter — ícone na Navbar com badge de não lidas.

import { useState, useEffect, useCallback, useRef } from "react";
import { useOmniStore } from "../../lib/store";
import { api } from "../../lib/api";

const TYPE_CONFIG = {
  post_reaction:  { icon: "❤️",  label: "reagiu ao seu post"        },
  post_comment:   { icon: "💬",  label: "comentou no seu post"      },
  comment_reply:  { icon: "↩️",  label: "respondeu seu comentário"  },
  mention:        { icon: "@",   label: "mencionou você"            },
  system:         { icon: "📢",  label: "mensagem do sistema"       },
};

function formatRelative(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${d}d`;
}

export function NotificationPanel() {
  const user = useOmniStore((s) => s.user);
  const [open,        setOpen]        = useState(false);
  const [notifs,      setNotifs]      = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading,     setLoading]     = useState(false);
  const panelRef = useRef(null);

  const fetchCount = useCallback(async () => {
    if (!user) return;
    const res = await api.get("/community/notifications/count").catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setUnreadCount(data.unreadCount ?? 0);
    }
  }, [user]);

  const fetchNotifs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const res = await api.get("/community/notifications").catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setNotifs(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    }
    setLoading(false);
  }, [user]);

  // Polling do contador a cada 30s
  useEffect(() => {
    fetchCount();
    const t = setInterval(fetchCount, 30_000);
    return () => clearInterval(t);
  }, [fetchCount]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!panelRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleOpen() {
    if (!open) {
      setOpen(true);
      await fetchNotifs();
      // Marca tudo como lido após abrir
      if (unreadCount > 0) {
        await api.post("/community/notifications/read-all", {});
        setUnreadCount(0);
      }
    } else {
      setOpen(false);
    }
  }

  if (!user) return null;

  return (
    <div ref={panelRef} className="relative">
      {/* Botão ícone */}
      <button
        onClick={handleOpen}
        className="tv-focusable relative w-8 h-8 rounded-xl flex items-center justify-center hover:bg-om-surface transition-colors"
        title="Notificações"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-om-muted">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>

        {/* Badge de não lidas */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-om-danger text-white text-[10px] font-bold flex items-center justify-center px-1 animate-scale-in">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Painel dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-om-card border border-om-border rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden animate-scale-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-om-border">
            <h3 className="font-display font-semibold text-sm text-om-text">Notificações</h3>
            <span className="text-xs text-om-muted">{notifs.length > 0 ? `${notifs.length} total` : ""}</span>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 rounded-full border-2 border-om-accent border-t-transparent animate-spin" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-sm text-om-muted">Nenhuma notificação ainda.</p>
              </div>
            ) : (
              notifs.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? { icon: "📋", label: n.type };
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-om-border/50 last:border-0 hover:bg-om-surface transition-colors ${
                      !n.isRead ? "bg-om-accent/5" : ""
                    }`}
                  >
                    {/* Avatar do ator */}
                    <div className="shrink-0 w-8 h-8 rounded-full bg-om-accent/20 border border-om-accent/20 flex items-center justify-center overflow-hidden">
                      {n.avatarUrl ? (
                        <img src={n.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-om-accent">
                          {n.username?.slice(0, 2).toUpperCase() ?? "?"}
                        </span>
                      )}
                    </div>

                    {/* Texto */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-om-text leading-snug">
                        <span className="font-semibold">@{n.username}</span>
                        {" "}<span className="text-om-muted">{cfg.label}</span>
                        {n.message && <span className="text-om-accent"> {n.message}</span>}
                      </p>
                      <p className="text-[11px] text-om-muted font-mono mt-0.5">
                        {formatRelative(n.createdAt)}
                      </p>
                    </div>

                    {/* Ícone do tipo */}
                    <span className="shrink-0 text-base">{cfg.icon}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
