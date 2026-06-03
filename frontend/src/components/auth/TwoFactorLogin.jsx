// FILE: frontend/src/components/auth/TwoFactorLogin.jsx
// Tela de input do código 2FA exibida após senha correta.
// Suporta código TOTP de 6 dígitos ou código de backup.

import { useState } from "react";

/**
 * @param {{
 *   onSubmit: (code: string, isBackup: boolean) => Promise<void>,
 *   onBack: () => void,
 *   loading: boolean,
 *   error: string,
 * }} props
 */
export function TwoFactorLogin({ onSubmit, onBack, loading, error }) {
  const [code,      setCode]      = useState("");
  const [isBackup,  setIsBackup]  = useState(false);

  function handleSubmit() {
    if (!code.trim()) return;
    onSubmit(code, isBackup);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-om-accent/15 border border-om-accent/20 flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl">🔐</span>
        </div>
        <h3 className="font-display font-bold text-lg text-om-text">Verificação em 2 etapas</h3>
        <p className="text-sm text-om-muted mt-1">
          {isBackup
            ? "Digite um dos seus códigos de recuperação."
            : "Abra o app autenticador e insira o código de 6 dígitos."}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <input
          type={isBackup ? "text" : "text"}
          inputMode={isBackup ? "text" : "numeric"}
          pattern={isBackup ? undefined : "[0-9]*"}
          maxLength={isBackup ? 11 : 6}
          value={code}
          onChange={(e) => setCode(isBackup ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={isBackup ? "XXXXX-XXXXX" : "000000"}
          className={`w-48 bg-om-surface border rounded-2xl px-4 py-3 text-center font-mono tracking-widest text-xl text-om-text outline-none focus:border-om-accent/60 transition-colors ${
            error ? "border-om-danger/60" : "border-om-border"
          }`}
          autoFocus
        />

        {error && (
          <p className="text-sm text-om-danger">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={code.length < 6 || loading}
          className="w-48 tv-focusable py-3 rounded-2xl bg-om-accent hover:bg-om-accent-dim text-white font-semibold text-sm disabled:opacity-60 transition-all active:scale-95"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Verificando…
            </span>
          ) : "Verificar"}
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-om-muted pt-2 border-t border-om-border">
        <button onClick={onBack} className="hover:text-om-text transition-colors">
          ← Voltar
        </button>
        <button onClick={() => { setIsBackup((v) => !v); setCode(""); }}
          className="text-om-accent hover:underline">
          {isBackup ? "Usar código do app" : "Usar código de recuperação"}
        </button>
      </div>
    </div>
  );
}
