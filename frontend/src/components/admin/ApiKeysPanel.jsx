// FILE: frontend/src/components/admin/ApiKeysPanel.jsx
// Painel de configuração de APIs externas.
// Exibe quais keys estão configuradas/pendentes e permite salvar novos valores.
// Valores sensíveis nunca chegam ao frontend — só o status (configurado/não).

import { useState, useCallback } from "react";
import { useAdminData } from "../../hooks/useAdmin";
import { api } from "../../lib/api";
import { toastSuccess, toastError } from "../ui/Toast";

const KEY_GROUPS = [
  {
    group: "Stripe",
    emoji: "💳",
    description: "Necessário para processar pagamentos VIP e compras de OmniCoins.",
    docsUrl: "https://dashboard.stripe.com/apikeys",
    keys: ["stripe_publishable_key", "stripe_secret_key", "stripe_webhook_secret", "stripe_vip_price_id"],
  },
  {
    group: "Pacotes de OmniCoins",
    emoji: "🪙",
    description: "Stripe Price IDs dos pacotes de compra avulsa. Crie em dashboard.stripe.com/products.",
    keys: ["stripe_price_coins_100", "stripe_price_coins_500", "stripe_price_coins_1200"],
  },
  {
    group: "Email (SMTP)",
    emoji: "📧",
    description: "Envio de emails de confirmação e notificações.",
    keys: ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from"],
  },
];

function KeyRow({ keyDef, onSave }) {
  const [editing,  setEditing]  = useState(false);
  const [value,    setValue]    = useState("");
  const [saving,   setSaving]   = useState(false);

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    const res  = await api.post("/admin/api-keys", { key: keyDef.key, value });
    setSaving(false);
    if (res.ok) {
      toastSuccess(`"${keyDef.key}" salva com segurança.`);
      setEditing(false);
      setValue("");
      onSave();
    } else {
      const d = await res.json();
      toastError(d.message ?? "Erro ao salvar.");
    }
  }

  return (
    <div className="py-3 border-b border-om-border last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <code className="text-xs font-mono text-om-accent">{keyDef.key}</code>
            <span className={`badge text-[10px] ${
              keyDef.isConfigured
                ? "bg-om-safe/15 text-om-safe border border-om-safe/20"
                : "bg-om-danger/15 text-om-danger border border-om-danger/20"
            }`}>
              {keyDef.isConfigured ? "✓ configurada" : "✗ pendente"}
            </span>
            {keyDef.isSensitive && (
              <span className="badge bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px]">
                🔒 sensível
              </span>
            )}
          </div>
          {keyDef.description && (
            <p className="text-xs text-om-muted">{keyDef.description}</p>
          )}
        </div>

        <button
          onClick={() => setEditing((v) => !v)}
          className="tv-focusable shrink-0 px-3 py-1.5 rounded-xl border border-om-border bg-om-surface text-xs font-medium text-om-muted hover:text-om-text hover:border-om-accent/30 transition-colors"
        >
          {keyDef.isConfigured ? "Alterar" : "Configurar"}
        </button>
      </div>

      {editing && (
        <div className="mt-3 flex gap-2 animate-fade-in">
          <input
            type={keyDef.isSensitive ? "password" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder={keyDef.isSensitive ? "••••••••••••••••" : `Valor de ${keyDef.key}`}
            className="flex-1 bg-om-bg border border-om-border rounded-xl px-4 py-2.5 text-sm text-om-text font-mono outline-none focus:border-om-accent/60 transition-colors"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={!value.trim() || saving}
            className="tv-focusable px-4 py-2.5 rounded-xl bg-om-accent hover:bg-om-accent-dim text-white text-xs font-semibold disabled:opacity-50 transition-all"
          >
            {saving ? "…" : "Salvar"}
          </button>
          <button
            onClick={() => { setEditing(false); setValue(""); }}
            className="tv-focusable px-3 py-2.5 rounded-xl border border-om-border text-om-muted hover:text-om-text text-xs transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

export function ApiKeysPanel() {
  const { data, loading, refetch } = useAdminData("/admin/api-keys");
  const keys = data?.keys ?? [];

  const getKey = useCallback((k) => keys.find((r) => r.key === k), [keys]);

  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Aviso de segurança */}
      <div className="p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/20">
        <p className="text-sm font-semibold text-yellow-400 mb-1">🔐 Armazenamento seguro</p>
        <p className="text-xs text-om-muted leading-relaxed">
          Valores marcados como sensíveis são criptografados com <strong className="text-om-text">AES-256-GCM</strong> antes de serem salvos no banco.
          A chave mestra (<code className="font-mono text-om-accent text-[11px]">MASTER_KEY</code>) fica apenas no servidor — nunca no banco.
          Os valores nunca são retornados pela API — apenas o status de configurado/pendente.
        </p>
      </div>

      {/* Grupos de API keys */}
      {KEY_GROUPS.map((group) => (
        <div key={group.group} className="bg-om-card border border-om-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-om-border flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold text-om-text flex items-center gap-2">
                <span>{group.emoji}</span>
                {group.group}
              </h3>
              <p className="text-xs text-om-muted mt-0.5">{group.description}</p>
            </div>
            {group.docsUrl && (
              <a href={group.docsUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-om-accent hover:underline">
                Documentação →
              </a>
            )}
          </div>

          <div className="px-5">
            {group.keys.map((k) => {
              const keyDef = getKey(k);
              if (!keyDef) return null;
              return <KeyRow key={k} keyDef={keyDef} onSave={refetch} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
