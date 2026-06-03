// FILE: frontend/src/components/ui/Sidebar.jsx
// Navegação lateral colapsável para desktop.
// No mobile, é ocultada — usa-se a bottom navigation.

import { useState } from "react";
import { useOmniStore } from "../../lib/store";
import { useAuth } from "../../hooks/useAuth";
import { Icon, Logo } from "../../lib/icons.jsx";

const NAV_ITEMS = [
  { id: "library",    label: "Início",      icon: "home",         section: "main"     },
  { id: "search",     label: "Busca",       icon: "search",       section: "main"     },
  { id: "categories", label: "Categorias",  icon: "checklist",    section: "main"     },
  { id: "extensions", label: "Extensões",   icon: "extensions",   section: "main"     },
  // Social (Patch #17)
  { id: "ranking",    label: "Ranking",     icon: "badge",        section: "main"     },
  { id: "community",  label: "Comunidade",  icon: "browserEdit",  section: "social" },
  { id: "shop",       label: "Loja",        icon: "flash",        section: "social" },
  // Info
  { id: "settings",   label: "Config",      icon: "settings",     section: "info"     },
  { id: "profile",    label: "Meu Perfil",  icon: "badge",        section: "info",    authOnly: true },
];

const SECTION_LABELS = {
  main:   "NAVEGAR",
  social: "SOCIAL",
  info:   "INFORMAÇÕES",
};

/**
 * @param {{ collapsed: boolean, onToggle: () => void }} props
 */
export function Sidebar({ collapsed, onToggle }) {
  const activeTab    = useOmniStore((s) => s.activeTab);
  const setActiveTab = useOmniStore((s) => s.setActiveTab);
  const { isAuthenticated } = useAuth();

  const sections = ["main", "social", "info"];

  return (
    <aside
      className={`hidden lg:flex flex-col fixed left-0 top-14 bottom-0 z-30
                  bg-om-bg border-r border-om-border transition-all duration-300
                  ${collapsed ? "w-[60px]" : "w-56"}`}
    >
      {/* Toggle collapse */}
      <button
        onClick={onToggle}
        className="tv-focusable absolute -right-3 top-4 w-6 h-6 rounded-full
                   bg-om-card border border-om-border flex items-center justify-center
                   hover:border-om-accent/40 transition-colors z-10 shadow-sm"
        title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 text-om-muted">
          <path strokeLinecap="round" strokeLinejoin="round"
            d={collapsed ? "m8.25 4.5 7.5 7.5-7.5 7.5" : "M15.75 19.5 8.25 12l7.5-7.5"} />
        </svg>
      </button>

      {/* Nav items por seção */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-4">
        {sections.map((section) => {
          const sectionItems = NAV_ITEMS.filter((i) => i.section === section);
          if (sectionItems.length === 0) return null;

          return (
            <div key={section}>
              {/* Label da seção */}
              {!collapsed && (
                <p className="text-[10px] font-mono font-semibold text-om-muted/60 tracking-widest px-3 mb-1">
                  {SECTION_LABELS[section]}
                </p>
              )}

              {sectionItems.map(({ id, label, icon, soon, authOnly }) => {
                if (authOnly && !isAuthenticated) return null;
                const isActive = activeTab === id;

                return (
                  <button
                    key={id}
                    onClick={() => !soon && setActiveTab(id)}
                    disabled={soon}
                    title={collapsed ? label : undefined}
                    className={`tv-focusable w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                transition-all duration-150 group
                                ${isActive
                                  ? "bg-om-accent/15 text-om-accent"
                                  : soon
                                    ? "text-om-muted/40 cursor-not-allowed"
                                    : "text-om-muted hover:text-om-text hover:bg-om-surface"
                                }`}
                  >
                    <Icon
                      name={icon}
                      size={18}
                      className="shrink-0"
                      style={{ filter: isActive
                        ? "brightness(0) saturate(100%) invert(58%) sepia(75%) saturate(570%) hue-rotate(346deg)"
                        : soon
                          ? "brightness(0) invert(0.3)"
                          : "brightness(0) invert(0.6)" }}
                    />

                    {!collapsed && (
                      <span className="text-sm font-medium truncate flex-1 text-left">
                        {label}
                      </span>
                    )}

                    {!collapsed && soon && (
                      <span className="text-[10px] font-mono text-om-accent/60 border border-om-accent/20 px-1.5 py-0.5 rounded-md shrink-0">
                        em breve
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Logo no rodapé (apenas expandido) */}
      {!collapsed && (
        <div className="p-4 border-t border-om-border flex items-center gap-2">
          <img src="/assets/logo/oni-logo.png" alt="OmniMedia" className="w-6 h-6 rounded-md object-cover opacity-60" draggable={false} />
          <span className="text-xs text-om-muted font-display font-semibold">
            Omni<span className="text-om-accent/70">Media</span>
          </span>
        </div>
      )}
    </aside>
  );
}

// ── Bottom navigation (mobile) ────────────────────────────────────────────────
export function BottomNav() {
  const activeTab    = useOmniStore((s) => s.activeTab);
  const setActiveTab = useOmniStore((s) => s.setActiveTab);

  const BOTTOM_ITEMS = [
    { id: "library",    label: "Início",    icon: "home"       },
    { id: "discover",   label: "Descobrir", icon: "search"     },
    { id: "extensions", label: "Extensões", icon: "extensions" },
    { id: "settings",   label: "Config",    icon: "settings"   },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-om-bg/95 backdrop-blur-md border-t border-om-border">
      <div className="flex items-stretch h-16">
        {BOTTOM_ITEMS.map(({ id, label, icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`tv-focusable flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? "text-om-accent" : "text-om-muted"
              }`}
            >
              <Icon
                name={icon} size={20}
                style={{ filter: isActive
                  ? "brightness(0) saturate(100%) invert(58%) sepia(75%) saturate(570%) hue-rotate(346deg)"
                  : "brightness(0) invert(0.5)" }}
              />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
