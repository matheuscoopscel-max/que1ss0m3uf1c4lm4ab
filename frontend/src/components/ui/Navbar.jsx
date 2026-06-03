// FILE: frontend/src/components/ui/Navbar.jsx — Patch #12
// Adicionado: avatar do usuário logado / botão Entrar.

import { useState } from "react";
import { useOmniStore } from "../../lib/store";
import { useAuth } from "../../hooks/useAuth";
import { useAdminGuard } from "../../hooks/useAdmin";
import { Icon, Logo } from "../../lib/icons.jsx";
import { AuthModal } from "../auth/AuthModal";
import { OmniCoinsBalance } from "../shop/OmniCoinsBalance";
import { XPBar } from "../ui/XPBar";
import { NotificationPanel } from "../community/NotificationPanel";
import { VIPBadge } from "../ui/VIPBadge";
import { useSubscription } from "../../hooks/useSubscription";
import { toastSuccess, toastInfo } from "../ui/Toast";
import { useEffect } from "react";

const TABS = [
  { id: "library",    label: "Biblioteca", icon: "library"    },
  { id: "extensions", label: "Extensões",  icon: "extensions" },
  { id: "settings",   label: "Config",     icon: "settings"   },
];

export function Navbar() {
  const activeTab      = useOmniStore((s) => s.activeTab);
  const setActiveTab   = useOmniStore((s) => s.setActiveTab);
  const installedCount = useOmniStore((s) => s.installedPlugins.length);
  const { user, isAuthenticated, logout } = useAuth();
  const { isAdmin } = useAdminGuard();
  const { isVip } = useSubscription();

  // Mostra toast de resultado de pagamento Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") { toastSuccess("Pagamento confirmado! Obrigado por apoiar o OmniMedia."); }
    if (payment === "canceled") { toastInfo("Pagamento cancelado."); }
    if (payment) { params.delete("payment"); window.history.replaceState(null, "", window.location.pathname + (params.toString() ? `?${params}` : "")); }
  }, []);
  const [showAuth, setShowAuth]       = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [authTab, setAuthTab]         = useState("login");

  function openLogin()    { setAuthTab("login");    setShowAuth(true); }
  function openRegister() { setAuthTab("register"); setShowAuth(true); }

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 h-14 bg-om-bg/90 backdrop-blur-md border-b border-om-border">
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-om-border">
              <img src="/assets/logo/oni-logo.png" alt="OmniMedia" className="w-full h-full object-cover" draggable={false} />
            </div>
            <span className="font-display font-bold text-base text-om-text tracking-tight">
              Omni<span className="text-om-accent">Media</span>
            </span>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1">
            {TABS.map(({ id, label, icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`tv-focusable relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive ? "bg-om-accent/15 text-om-accent" : "text-om-muted hover:text-om-text hover:bg-om-surface"
                  }`}
                >
                  <Icon
                    name={icon} size={16}
                    style={{ filter: isActive
                      ? "brightness(0) saturate(100%) invert(58%) sepia(75%) saturate(570%) hue-rotate(346deg)"
                      : "brightness(0) invert(1) opacity(0.6)" }}
                  />
                  <span className="hidden sm:inline">{label}</span>
                  {id === "extensions" && installedCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-om-accent text-white text-[10px] font-mono flex items-center justify-center">
                      {installedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Auth area */}
          <div className="flex items-center gap-2">
            <OmniCoinsBalance />
            {isAuthenticated ? (
              // Avatar + dropdown
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="tv-focusable flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-om-surface transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-om-accent/20 border border-om-accent/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-om-accent uppercase">
                      {user.username[0]}
                    </span>
                  </div>
                  <span className="text-sm text-om-text font-medium hidden sm:inline max-w-[100px] truncate">
                    {user.username}
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 text-om-muted">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-44 bg-om-card border border-om-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                      <div className="px-4 py-3 border-b border-om-border">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-om-text truncate">{user.username}</p>
                          {isVip && <VIPBadge size="sm" />}
                        </div>
                        <p className="text-xs text-om-muted truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => { setActiveTab("profile"); setShowUserMenu(false); }}
                        className="tv-focusable w-full flex items-center gap-2 px-4 py-3 text-sm text-om-text hover:bg-om-surface transition-colors"
                      >
                        <Icon name="badge" size={14} style={{ filter: "brightness(0) invert(0.7)" }} />
                        Meu Perfil
                      </button>
                      <button
                        onClick={() => { setActiveTab("security"); setShowUserMenu(false); }}
                        className="tv-focusable w-full flex items-center gap-2 px-4 py-3 text-sm text-om-text hover:bg-om-surface transition-colors"
                      >
                        <Icon name="lock" size={14} style={{ filter: "brightness(0) invert(0.7)" }} />
                        Segurança
                      </button>
                      <button
                        onClick={() => { setActiveTab("support"); setShowUserMenu(false); }}
                        className="tv-focusable w-full flex items-center gap-2 px-4 py-3 text-sm text-om-text hover:bg-om-surface transition-colors"
                      >
                        <Icon name="help" size={14} style={{ filter: "brightness(0) invert(0.7)" }} />
                        Suporte
                      </button>
                      <button
                        onClick={() => { setActiveTab("privacy"); setShowUserMenu(false); }}
                        className="tv-focusable w-full flex items-center gap-2 px-4 py-3 text-sm text-om-text hover:bg-om-surface transition-colors"
                      >
                        <Icon name="lock" size={14} style={{ filter: "brightness(0) invert(0.7)" }} />
                        Privacidade & LGPD
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => { setActiveTab("admin"); setShowUserMenu(false); }}
                          className="tv-focusable w-full flex items-center gap-2 px-4 py-3 text-sm text-om-accent hover:bg-om-accent/5 transition-colors border-t border-om-border"
                        >
                          <Icon name="settings" size={14} style={{ filter: "brightness(0) saturate(100%) invert(58%) sepia(75%) saturate(570%) hue-rotate(346deg)" }} />
                          Painel Admin
                        </button>
                      )}
                      <button
                        onClick={() => { logout(); setShowUserMenu(false); }}
                        className="tv-focusable w-full flex items-center gap-2 px-4 py-3 text-sm text-om-danger hover:bg-om-danger/10 transition-colors"
                      >
                        <Icon name="power" size={14} style={{ filter: "brightness(0) saturate(100%) invert(40%) sepia(90%) saturate(600%) hue-rotate(330deg)" }} />
                        Sair
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Botões Entrar / Criar conta
              <div className="flex items-center gap-1.5">
                <button
                  onClick={openLogin}
                  className="tv-focusable px-3 py-1.5 rounded-lg text-sm font-medium text-om-muted hover:text-om-text hover:bg-om-surface transition-colors"
                >
                  Entrar
                </button>
                <button
                  onClick={openRegister}
                  className="tv-focusable px-3 py-1.5 rounded-lg text-sm font-semibold bg-om-accent hover:bg-om-accent-dim text-white transition-colors"
                >
                  Criar conta
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showAuth && (
        <AuthModal
          initialTab={authTab}
          onClose={() => setShowAuth(false)}
        />
      )}
    </>
  );
}
