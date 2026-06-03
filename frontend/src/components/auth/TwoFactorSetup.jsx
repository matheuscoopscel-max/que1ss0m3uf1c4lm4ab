// FILE: frontend/src/components/auth/TwoFactorSetup.jsx
// Fluxo de configuração de 2FA:
// Passo 1: exibe QR code para escanear no app autenticador
// Passo 2: pede o código TOTP para confirmar
// Passo 3: exibe os códigos de backup (mostrar apenas uma vez)

import { useState } from "react";
import { api } from "../../lib/api";
import { toastSuccess, toastError } from "../ui/Toast";

export function TwoFactorSetup({ onDone, onCancel }) {
  const [step,        setStep]        = useState("setup"); // setup | verify | backup
  const [qrCode,      setQrCode]      = useState("");
  const [secret,      setSecret]      = useState("");
  const [token,       setToken]       = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [copiedAll,   setCopiedAll]   = useState(false);

  // Passo 1: busca o QR code
  async function startSetup() {
    setLoading(true);
    const res  = await api.post("/security/2fa/setup", {});
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toastError(data.message ?? "Erro ao iniciar setup."); return; }
    setQrCode(data.qrCodeDataUrl);
    setSecret(data.secret);
    setStep("verify");
  }

  // Passo 2: confirma com código TOTP
  async function verifyToken() {
    if (token.length < 6) return;
    setLoading(true);
    const res  = await api.post("/security/2fa/verify", { token });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toastError(data.message ?? "Código inválido."); return; }
    setBackupCodes(data.backupCodes ?? []);
    setStep("backup");
  }

  // Passo 3: confirmou ver os códigos
  function finishSetup() {
    toastSuccess("2FA ativado com sucesso! 🔐");
    onDone();
  }

  function copyAllCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  if (step === "setup") {
    return (
      <div className="space-y-4 animate-fade-in">
        <div>
          <h3 className="font-display font-semibold text-om-text">Ativar autenticação em 2 fatores</h3>
          <p className="text-sm text-om-muted mt-1 leading-relaxed">
            Adiciona uma camada extra de segurança. Além da senha, você precisará de um código
            gerado pelo seu app autenticador (Google Authenticator, Authy, 1Password, etc.).
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={startSetup} disabled={loading}
            className="tv-focusable flex items-center gap-2 px-4 py-2.5 rounded-xl bg-om-accent hover:bg-om-accent-dim text-white text-sm font-semibold disabled:opacity-60 transition-all">
            {loading ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : "🔐"}
            Configurar 2FA
          </button>
          <button onClick={onCancel} className="tv-focusable px-4 py-2.5 rounded-xl border border-om-border text-om-muted text-sm hover:text-om-text transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="space-y-5 animate-fade-in">
        <div>
          <h3 className="font-display font-semibold text-om-text mb-1">Escaneie o QR Code</h3>
          <p className="text-xs text-om-muted">Abra seu app autenticador e escaneie o código abaixo.</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-2xl shadow-lg">
            <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
          </div>
        </div>

        {/* Chave manual */}
        <div className="space-y-1">
          <p className="text-xs text-om-muted">Ou insira a chave manualmente:</p>
          <div className="flex items-center gap-2 bg-om-surface border border-om-border rounded-xl px-4 py-2.5">
            <code className="text-xs font-mono text-om-text flex-1 break-all">{secret}</code>
            <button onClick={() => navigator.clipboard.writeText(secret)}
              className="text-xs text-om-accent hover:underline shrink-0">
              Copiar
            </button>
          </div>
        </div>

        {/* Input do código */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-om-text">Digite o código de 6 dígitos do app:</p>
          <div className="flex gap-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && verifyToken()}
              placeholder="000000"
              className="w-36 bg-om-surface border border-om-border rounded-xl px-4 py-2.5 text-center text-xl font-mono tracking-widest text-om-text outline-none focus:border-om-accent/60 transition-colors"
              autoFocus
            />
            <button onClick={verifyToken} disabled={token.length < 6 || loading}
              className="tv-focusable px-5 py-2.5 rounded-xl bg-om-accent hover:bg-om-accent-dim text-white font-semibold text-sm disabled:opacity-60 transition-all">
              {loading ? "Verificando…" : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Passo 3: Backup codes
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30">
        <p className="text-sm font-bold text-yellow-400 mb-1">⚠ Guarde estes códigos agora!</p>
        <p className="text-xs text-om-muted leading-relaxed">
          Estes são seus códigos de recuperação. Se perder acesso ao app autenticador,
          use um destes códigos para entrar. Cada código só funciona uma vez.
          <strong className="text-om-text"> Eles não serão exibidos novamente.</strong>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {backupCodes.map((code) => (
          <div key={code} className="font-mono text-sm text-om-text bg-om-surface border border-om-border rounded-xl px-3 py-2.5 text-center tracking-wider">
            {code}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={copyAllCodes}
          className="tv-focusable flex items-center gap-2 px-4 py-2.5 rounded-xl border border-om-border bg-om-surface text-sm text-om-muted hover:text-om-text transition-colors">
          {copiedAll ? "✓ Copiados!" : "📋 Copiar todos"}
        </button>
        <button onClick={finishSetup}
          className="tv-focusable flex-1 px-4 py-2.5 rounded-xl bg-om-accent hover:bg-om-accent-dim text-white font-semibold text-sm transition-all">
          Já guardei, continuar →
        </button>
      </div>
    </div>
  );
}
