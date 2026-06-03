// FILE: frontend/src/pages/AdminPage.jsx
// Painel administrativo completo com sidebar de seções.

import { useState } from "react";
import { useAdminGuard } from "../hooks/useAdmin";
import { AdminDashboard }  from "../components/admin/AdminDashboard";
import { UsersTable, PostsModeration, ShopManager, SupportTicketsAdmin } from "../components/admin/AdminTables";
import { ApiKeysPanel }    from "../components/admin/ApiKeysPanel";
import { AppSettings }     from "../components/admin/AppSettings";
import { Icon }            from "../lib/icons.jsx";

const SECTIONS = [
  { id: "dashboard",  label: "Dashboard",     icon: "flash",       component: AdminDashboard  },
  { id: "users",      label: "Usuários",      icon: "badge",       component: UsersTable      },
  { id: "posts",      label: "Moderação",     icon: "checklist",   component: PostsModeration },
  { id: "shop",       label: "Loja",          icon: "bookmark",    component: ShopManager     },
  { id: "settings",   label: "Configurações", icon: "settings",    component: AppSettings     },
  { id: "api-keys",   label: "APIs Externas", icon: "lock",        component: ApiKeysPanel    },
  { id: "support",    label: "Suporte",       icon: "help",        component: SupportTicketsAdmin },
];

export function AdminPage() {
  const { isAdmin, loading } = useAdminGuard();
  const [activeSection, setActiveSection] = useState("dashboard");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-om-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <Icon name="lock" size={56} className="opacity-20" style={{ filter: "brightness(0) invert(1)" }} />
        <h2 className="font-display font-bold text-xl text-om-text">Acesso restrito</h2>
        <p className="text-om-muted text-sm">Esta área é exclusiva para administradores.</p>
      </div>
    );
  }

  const ActiveComponent = SECTIONS.find((s) => s.id === activeSection)?.component ?? AdminDashboard;

  return (
    <div className="flex gap-6 min-h-[70vh]">
      {/* ── Sidebar Admin ──────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-52 shrink-0">
        <div className="bg-om-card border border-om-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-om-border bg-om-accent/5">
            <p className="text-xs font-mono font-semibold text-om-accent uppercase tracking-widest">
              ⚙ Admin Panel
            </p>
          </div>

          {/* Nav */}
          <nav className="p-2 space-y-0.5">
            {SECTIONS.map(({ id, label, icon }) => {
              const isActive = activeSection === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`tv-focusable w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left ${
                    isActive ? "bg-om-accent/15 text-om-accent" : "text-om-muted hover:text-om-text hover:bg-om-surface"
                  }`}
                >
                  <Icon name={icon} size={15} style={{ filter: isActive
                    ? "brightness(0) saturate(100%) invert(58%) sepia(75%) saturate(570%) hue-rotate(346deg)"
                    : "brightness(0) invert(0.5)" }}
                  />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* ── Conteúdo ───────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Mobile: tab pills */}
        <div className="md:hidden flex gap-1 overflow-x-auto pb-3 mb-4">
          {SECTIONS.map(({ id, label }) => (
            <button key={id} onClick={() => setActiveSection(id)}
              className={`tv-focusable shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                activeSection === id ? "bg-om-accent text-white border-om-accent" : "border-om-border text-om-muted bg-om-surface"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Título da seção */}
        <div className="mb-5">
          <h1 className="font-display font-bold text-2xl text-om-text">
            {SECTIONS.find((s) => s.id === activeSection)?.label}
          </h1>
        </div>

        {/* Componente ativo com transição */}
        <div className="animate-fade-in" key={activeSection}>
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
