// FILE: frontend/src/pages/SecurityPage.jsx
// Página de configurações de segurança da conta:
// - Status de segurança
// - Configurar / desativar 2FA
// - Sessões ativas
// - Histórico de eventos de segurança

import { useState, useEffect, useCallback } from "react";
import { useOmniStore } from "../lib/store";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import { TwoFactorSetup } from "../components/auth/TwoFactorSetup";
import { Icon } from "../lib/icons.jsx";
import { toastSuccess, toastError } from "../components/ui/Toast";

const EVENT_LABELS = {
  login_success:          { label: "Login bem-sucedido",        icon: "✅", color: "text-om-safe"   },
  login_failure:          { label: "Tentativa de login falhou", icon: "⚠️", color: "text-yellow-400"},
  logout:                 { label: "Logout",                    icon: "🚪", color: "text-om-muted"  },
  "2fa_enabled":          { label: "2FA ativado",               icon: "🔐", color: "text-om-safe"   },
  "2fa_disabled":         { label: "2FA desativado",            icon: "🔓", color: "text-yellow-400"},
  "2fa_failure":          { label: "Código 2FA inválido",       icon: "❌", color: "text-om-danger" },
  account_locked:         { label: "Conta bloqueada",           icon: "🔒", color: "text-om-danger" },
  token_reuse_detected:   { label: "Token reutilizado (alerta)",icon: "🚨", color: "text-om-danger" },
  password_change:        { label: "Senha alterada",            icon: "🔑", color: "text-sky-400"   },
};

function formatRelative(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m  < 1)  return "agora";
  if (m  < 60) return `${m}m atrás`;
  if (h  < 24) return `${h}h atrás`;
  if (d  < 30) return `${d}d atrás`;
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export function SecurityPage() {
  const user = useOmniStore((s) => s.user);
  const { logout } = useAuth();

  const [security, setSecurity] = useState(null);
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [show2FA,  setShow2FA]  = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [disableForm, setDisableForm]   = useState({ password: "", token: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [secRes, evRes] = await Promise.all([
      api.get("/security/status"),
      api.get("/security/events"),
    ]);
    if (secRes.ok) setSecurity((await secRes.json()).security);
    if (evRes.ok)  setEvents((await evRes.json()).events ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  async function handleDisable2FA() {
    const res  = await api.post("/security/2fa/disable", disableForm);
    const data = await res.json();
    if (res.ok) { toastSuccess("2FA desativado."); setDisabling2FA(false); fetchData(); }
    else toastError(data.message ?? "Erro.");
  }

  async function logoutAllSessions() {
    await api.post("/auth/logout-all", {});
    logout();
    toastSuccess("Todas as sessões encerradas.");
  }

  if (!user) return (
    <div className="text-center py-16">
      <Icon name="lock" size={48} className="mx-auto mb-3 opacity-20" style={{ filter: "brightness(0) invert(1)" }} />
      <p className="text-om-muted text-sm">Faça login para ver as configurações de segurança.</p>
    </div>
  );

  if (loading) return (
    <div className="space-y-4 max-w-2xl">
      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-om-text">Segurança da conta</h1>
        <p className="text-om-muted text-sm mt-0.5">Gerencie autenticação em dois fatores e monitore o acesso.</p>
      </div>

      {/* ── Status ─────────────────────────────────────────────────────────── */}
      <div className="bg-om-card border border-om-border rounded-2xl p-5 space-y-3">
        <h2 className="font-display font-semibold text-om-text">Visão geral</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "2FA",              value: security?.twoFactorEnabled ? "Ativo" : "Inativo",
              color: security?.twoFactorEnabled ? "text-om-safe" : "text-yellow-400" },
            { label: "Sessões ativas",   value: security?.activeSessions ?? 0, color: "text-om-text" },
            { label: "Falhas de login",  value: security?.failedLoginCount ?? 0,
              color: (security?.failedLoginCount ?? 0) > 0 ? "text-om-danger" : "text-om-text" },
            { label: "Último acesso",    value: formatRelative(security?.lastLoginAt), color: "text-om-muted" },
            { label: "IP último acesso", value: security?.lastLoginIp ?? "—", color: "text-om-muted" },
            { label: "Conta bloqueada",  value: security?.isLocked ? "Sim" : "Não",
              color: security?.isLocked ? "text-om-danger" : "text-om-safe" },
          ].map((s) => (
            <div key={s.label} className="bg-om-surface rounded-xl p-3 border border-om-border">
              <p className="text-[11px] text-om-muted">{s.label}</p>
              <p className={`text-sm font-semibold mt-0.5 ${s.color}`}>{String(s.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2FA ────────────────────────────────────────────────────────────── */}
      <div className="bg-om-card border border-om-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold text-om-text">Autenticação em 2 fatores</h2>
            <p className="text-xs text-om-muted mt-0.5">
              {security?.twoFactorEnabled
                ? "Seu login está protegido com 2FA via TOTP."
                : "Adicione uma camada extra de proteção à sua conta."}
            </p>
          </div>
          <span className={`badge text-[11px] font-semibold ${
            security?.twoFactorEnabled
              ? "bg-om-safe/15 text-om-safe border border-om-safe/20"
              : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20"
          }`}>
            {security?.twoFactorEnabled ? "✓ Ativo" : "Inativo"}
          </span>
        </div>

        {/* Setup */}
        {!security?.twoFactorEnabled && !show2FA && (
          <button onClick={() => setShow2FA(true)}
            className="tv-focusable flex items-center gap-2 px-4 py-2.5 rounded-xl bg-om-accent hover:bg-om-accent-dim text-white text-sm font-semibold transition-all">
            🔐 Ativar 2FA
          </button>
        )}

        {!security?.twoFactorEnabled && show2FA && (
          <TwoFactorSetup
            onDone={() => { setShow2FA(false); fetchData(); }}
            onCancel={() => setShow2FA(false)}
          />
        )}

        {/* Disable */}
        {security?.twoFactorEnabled && !disabling2FA && (
          <button onClick={() => setDisabling2FA(true)}
            className="tv-focusable flex items-center gap-2 px-4 py-2.5 rounded-xl border border-om-danger/30 text-om-danger text-sm hover:bg-om-danger/10 transition-colors">
            Desativar 2FA
          </button>
        )}

        {security?.twoFactorEnabled && disabling2FA && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-sm text-om-muted">Confirme sua identidade para desativar o 2FA:</p>
            <input type="password" placeholder="Sua senha" value={disableForm.password}
              onChange={(e) => setDisableForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full bg-om-surface border border-om-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-om-accent/60" />
            <input type="text" inputMode="numeric" placeholder="Código 2FA (opcional)" maxLength={6}
              value={disableForm.token}
              onChange={(e) => setDisableForm((f) => ({ ...f, token: e.target.value.replace(/\D/g, "") }))}
              className="w-full bg-om-surface border border-om-border rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-om-accent/60" />
            <div className="flex gap-2">
              <button onClick={() => setDisabling2FA(false)}
                className="tv-focusable px-4 py-2 rounded-xl border border-om-border text-om-muted text-xs hover:text-om-text">Cancelar</button>
              <button onClick={handleDisable2FA}
                className="tv-focusable px-4 py-2 rounded-xl bg-om-danger/15 border border-om-danger/30 text-om-danger text-xs hover:bg-om-danger/25">
                Confirmar desativação
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Sessões ─────────────────────────────────────────────────────────── */}
      <div className="bg-om-card border border-om-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-om-text">Sessões ativas</h2>
          <span className="badge bg-om-surface border border-om-border text-om-muted text-[10px] font-mono">
            {security?.activeSessions ?? 0} sessão(ões)
          </span>
        </div>
        <p className="text-xs text-om-muted">
          Se você notar sessões suspeitas ou perdeu um dispositivo, encerre todas imediatamente.
        </p>
        <button onClick={logoutAllSessions}
          className="tv-focusable flex items-center gap-2 px-4 py-2.5 rounded-xl border border-om-danger/30 text-om-danger text-sm hover:bg-om-danger/10 transition-colors">
          <Icon name="power" size={14} style={{ filter: "brightness(0) saturate(100%) invert(40%) sepia(90%) saturate(600%) hue-rotate(330deg)" }} />
          Encerrar todas as sessões
        </button>
      </div>

      {/* ── Histórico de eventos ─────────────────────────────────────────────── */}
      <div className="bg-om-card border border-om-border rounded-2xl p-5 space-y-3">
        <h2 className="font-display font-semibold text-om-text">Atividade recente</h2>
        {events.length === 0 ? (
          <p className="text-sm text-om-muted text-center py-4">Nenhum evento registrado.</p>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 15).map((evt, i) => {
              const def = EVENT_LABELS[evt.event_type] ?? { label: evt.event_type, icon: "📋", color: "text-om-muted" };
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-om-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-base">{def.icon}</span>
                    <div>
                      <p className={`text-sm font-medium ${def.color}`}>{def.label}</p>
                      {evt.ip_address && (
                        <p className="text-[11px] text-om-muted font-mono">{evt.ip_address}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-om-muted/60 font-mono shrink-0">
                    {formatRelative(evt.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
