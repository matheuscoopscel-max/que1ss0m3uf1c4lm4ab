// FILE: frontend/src/pages/SupportPage.jsx
// Central de suporte: formulário de contato + histórico de tickets.

import { useState, useEffect } from "react";
import { useOmniStore } from "../lib/store";
import { api } from "../lib/api";
import { toastSuccess, toastError } from "../components/ui/Toast";

const CATEGORIES = [
  { value: "bug",     label: "🐛 Erro / Problema técnico"      },
  { value: "feature", label: "💡 Sugestão de funcionalidade"   },
  { value: "account", label: "👤 Problema com a conta"         },
  { value: "privacy", label: "🔒 Privacidade / LGPD"           },
  { value: "billing", label: "💳 Cobrança / VIP"               },
  { value: "plugin",  label: "🧩 Problema com extensão"        },
  { value: "other",   label: "📬 Outro assunto"                },
];

const STATUS_CONFIG = {
  open:        { label: "Aberto",       color: "bg-sky-500/15 text-sky-400 border-sky-500/20"     },
  in_progress: { label: "Em análise",   color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  resolved:    { label: "Resolvido",    color: "bg-om-safe/15 text-om-safe border-om-safe/20"     },
  closed:      { label: "Encerrado",    color: "bg-om-muted/15 text-om-muted border-om-border"    },
};

export function SupportPage() {
  const user = useOmniStore((s) => s.user);
  const [tab,       setTab]       = useState("new");
  const [tickets,   setTickets]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [sending,   setSending]   = useState(false);
  const [form,      setForm]      = useState({
    category:   "bug",
    subject:    "",
    message:    "",
    guestEmail: "",
  });

  useEffect(() => {
    if (tab === "history" && user) {
      setLoading(true);
      api.get("/support/tickets")
        .then((r) => r.json())
        .then((d) => setTickets(d.tickets ?? []))
        .finally(() => setLoading(false));
    }
  }, [tab, user]);

  async function handleSubmit() {
    if (!form.subject.trim() || !form.message.trim()) return;
    if (!user && !form.guestEmail) {
      toastError("Informe seu email para enviar sem conta.");
      return;
    }
    setSending(true);
    const res  = await api.post("/support/tickets", form);
    const data = await res.json();
    setSending(false);
    if (res.ok) {
      toastSuccess("Mensagem enviada! Responderemos em breve. 📬");
      setForm({ category: "bug", subject: "", message: "", guestEmail: "" });
      setTab("history");
    } else {
      toastError(data.message ?? "Erro ao enviar. Tente novamente.");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-om-text">Central de Suporte</h1>
        <p className="text-om-muted text-sm mt-0.5">
          Dúvidas, problemas ou sugestões? Fale com a gente.
        </p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: "⚡", title: "Resposta rápida", desc: "Respondemos em até 48h" },
          { icon: "🔒", title: "LGPD", desc: "Seus dados protegidos" },
          { icon: "🧩", title: "Plugins", desc: "Suporte a extensões" },
        ].map((c) => (
          <div key={c.title} className="bg-om-card border border-om-border rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">{c.icon}</p>
            <p className="text-sm font-semibold text-om-text">{c.title}</p>
            <p className="text-xs text-om-muted">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      {user && (
        <div className="flex gap-1 bg-om-surface border border-om-border rounded-xl p-1 w-fit">
          {[["new","✉ Novo contato"],["history","📋 Meus tickets"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`tv-focusable px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === id ? "bg-om-card text-om-text shadow-sm" : "text-om-muted hover:text-om-text"
              }`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Formulário */}
      {tab === "new" && (
        <div className="bg-om-card border border-om-border rounded-2xl p-5 space-y-4 animate-fade-in">
          <h2 className="font-display font-semibold text-om-text">Enviar mensagem</h2>

          {!user && (
            <div>
              <label className="text-xs font-medium text-om-text mb-1 block">Seu email</label>
              <input type="email" value={form.guestEmail}
                onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))}
                placeholder="seu@email.com"
                className="w-full bg-om-surface border border-om-border rounded-xl px-4 py-2.5 text-sm text-om-text outline-none focus:border-om-accent/60 transition-colors" />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-om-text mb-1 block">Categoria</label>
            <select value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full bg-om-surface border border-om-border rounded-xl px-4 py-2.5 text-sm text-om-text outline-none focus:border-om-accent/60 transition-colors">
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-om-text mb-1 block">Assunto</label>
            <input type="text" value={form.subject} maxLength={200}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Descreva brevemente o assunto"
              className="w-full bg-om-surface border border-om-border rounded-xl px-4 py-2.5 text-sm text-om-text outline-none focus:border-om-accent/60 transition-colors" />
          </div>

          <div>
            <label className="text-xs font-medium text-om-text mb-1 block">
              Mensagem <span className="text-om-muted font-normal">({form.message.length}/5000)</span>
            </label>
            <textarea value={form.message} rows={6} maxLength={5000}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Descreva seu problema ou sugestão com o máximo de detalhes possível..."
              className="w-full bg-om-surface border border-om-border rounded-xl px-4 py-2.5 text-sm text-om-text outline-none focus:border-om-accent/60 transition-colors resize-none" />
          </div>

          {/* Aviso LGPD */}
          <p className="text-[11px] text-om-muted leading-relaxed">
            Ao enviar, você concorda que os dados informados serão usados exclusivamente para
            responder à sua solicitação, conforme nossa{" "}
            <button onClick={() => {}} className="text-om-accent hover:underline">
              Política de Privacidade
            </button>
            .
          </p>

          <button onClick={handleSubmit}
            disabled={!form.subject.trim() || !form.message.trim() || sending || (!user && !form.guestEmail)}
            className="tv-focusable flex items-center gap-2 px-6 py-3 rounded-xl bg-om-accent hover:bg-om-accent-dim text-white font-semibold text-sm disabled:opacity-50 transition-all active:scale-95">
            {sending ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : "📬"}
            {sending ? "Enviando…" : "Enviar mensagem"}
          </button>
        </div>
      )}

      {/* Histórico de tickets */}
      {tab === "history" && user && (
        <div className="space-y-3 animate-fade-in">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 bg-om-card border border-om-border rounded-2xl">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-om-muted text-sm">Nenhum ticket ainda.</p>
            </div>
          ) : tickets.map((t) => {
            const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.open;
            const cat = CATEGORIES.find((c) => c.value === t.category);
            return (
              <div key={t.id} className="bg-om-card border border-om-border rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-om-text truncate">{t.subject}</p>
                      <span className={`badge text-[10px] border ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-om-muted mt-0.5">
                      {cat?.label} · {new Date(t.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                {t.admin_reply && (
                  <div className="mt-2 p-3 bg-om-accent/5 border border-om-accent/20 rounded-xl">
                    <p className="text-[11px] font-semibold text-om-accent mb-1">Resposta da equipe:</p>
                    <p className="text-sm text-om-text leading-relaxed">{t.admin_reply}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
