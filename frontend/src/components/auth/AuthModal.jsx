// FILE: frontend/src/components/auth/AuthModal.jsx
// Modal de login/cadastro com toggle entre as duas telas.
// Fecha ao pressionar Esc ou clicar fora.

import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { TwoFactorLogin } from "./TwoFactorLogin";
import { PrivacyConsentCheckbox } from "./PrivacyConsentCheckbox";
import { Icon } from "../../lib/icons.jsx";

/**
 * @param {{ onClose: () => void, initialTab?: 'login'|'register' }} props
 */
export function AuthModal({ onClose, initialTab = "login" }) {
  const [tab, setTab]         = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const [loginForm, setLoginForm]       = useState({ email: "", password: "" });
  const [needs2FA,  setNeeds2FA]         = useState(false);
  const [twoFAError, setTwoFAError]      = useState("");
  const [registerForm, setRegisterForm] = useState({ email: "", username: "", password: "", confirm: "" });

  const { login, register } = useAuth();

  // Fecha com Esc
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleLogin(e) {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    const result = await login(loginForm);
    setLoading(false);
    if (result.success) onClose();
    else if (result.requires2FA) setNeeds2FA(true);
    else setErrors({ general: result.message });
  }

  async function handle2FASubmit(code, isBackup) {
    setTwoFAError("");
    setLoading(true);
    const result = await login({
      ...loginForm,
      [isBackup ? "backupCode" : "totpToken"]: code,
    });
    setLoading(false);
    if (result.success) onClose();
    else setTwoFAError(result.message ?? "Código inválido.");
  }

  async function handleRegister(e) {
    e.preventDefault();
    setErrors({});

    if (registerForm.password !== registerForm.confirm) {
      setErrors({ confirm: "As senhas não coincidem." });
      return;
    }

    setLoading(true);
    const result = await register({
      email:    registerForm.email,
      username: registerForm.username,
      password: registerForm.password,
    });
    setLoading(false);

    if (result.success) {
      onClose();
    } else {
      const fieldErrors = {};
      result.errors?.forEach((err) => {
        const field = err.path ?? "general";
        fieldErrors[field] = err.msg;
      });
      if (Object.keys(fieldErrors).length === 0) {
        fieldErrors.general = result.message;
      }
      setErrors(fieldErrors);
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-om-card border border-om-border rounded-2xl w-full max-w-md shadow-2xl shadow-black/60 overflow-hidden animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-om-border">
          <div className="flex items-center gap-2">
            <img src="/assets/logo/oni-logo.png" alt="OmniMedia" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-display font-bold text-om-text">
              Omni<span className="text-om-accent">Media</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="tv-focusable w-8 h-8 rounded-lg hover:bg-om-surface flex items-center justify-center text-om-muted hover:text-om-text transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 p-2 bg-om-surface mx-6 mt-5 rounded-xl">
          {[["login", "Entrar"], ["register", "Criar conta"]].map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setTab(id); setErrors({}); }}
              className={`tv-focusable flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                tab === id ? "bg-om-card text-om-text shadow-sm" : "text-om-muted hover:text-om-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Erro geral */}
          {errors.general && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-om-danger/10 border border-om-danger/30">
              <Icon name="warning" size={14} style={{ filter: "brightness(0) saturate(100%) invert(40%) sepia(90%) saturate(600%) hue-rotate(330deg)" }} />
              <p className="text-sm text-om-danger">{errors.general}</p>
            </div>
          )}

          {/* ── Login ──────────────────────────────────────────────── */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field
                label="Email"
                type="email"
                value={loginForm.email}
                onChange={(v) => setLoginForm((s) => ({ ...s, email: v }))}
                error={errors.email}
                placeholder="seu@email.com"
                required
              />
              <Field
                label="Senha"
                type="password"
                value={loginForm.password}
                onChange={(v) => setLoginForm((s) => ({ ...s, password: v }))}
                error={errors.password}
                placeholder="••••••••"
                required
              />
              <SubmitButton loading={loading}>Entrar</SubmitButton>
            </form>
          )}

          {/* ── Cadastro ───────────────────────────────────────────── */}
          {tab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <Field
                label="Email"
                type="email"
                value={registerForm.email}
                onChange={(v) => setRegisterForm((s) => ({ ...s, email: v }))}
                error={errors.email}
                placeholder="seu@email.com"
                required
              />
              <Field
                label="Username"
                type="text"
                value={registerForm.username}
                onChange={(v) => setRegisterForm((s) => ({ ...s, username: v }))}
                error={errors.username}
                placeholder="seu_usuario"
                required
              />
              <Field
                label="Senha"
                type="password"
                value={registerForm.password}
                onChange={(v) => setRegisterForm((s) => ({ ...s, password: v }))}
                error={errors.password}
                placeholder="mínimo 8 caracteres"
                required
              />
              <Field
                label="Confirmar senha"
                type="password"
                value={registerForm.confirm}
                onChange={(v) => setRegisterForm((s) => ({ ...s, confirm: v }))}
                error={errors.confirm}
                placeholder="••••••••"
                required
              />
              <SubmitButton loading={loading}>Criar conta</SubmitButton>
            </form>
          )}

          {/* Footer info */}
          <p className="text-center text-xs text-om-muted">
            Conta opcional —{" "}
            <button onClick={onClose} className="text-om-accent hover:underline">
              continuar sem conta
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, error, placeholder, required }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-om-muted">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`w-full bg-om-surface border rounded-xl px-4 py-2.5 text-sm text-om-text
                    placeholder:text-om-muted/50 outline-none transition-colors ${
                      error
                        ? "border-om-danger/60 focus:border-om-danger"
                        : "border-om-border focus:border-om-accent/60"
                    }`}
      />
      {error && <p className="text-xs text-om-danger">{error}</p>}
    </div>
  );
}

function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="tv-focusable w-full flex items-center justify-center gap-2
                 bg-om-accent hover:bg-om-accent-dim text-white font-semibold
                 py-2.5 rounded-xl transition-all duration-150 active:scale-[0.99]
                 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
    >
      {loading && (
        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  );
}
