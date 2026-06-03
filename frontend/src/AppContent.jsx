// FILE: frontend/src/AppContent.jsx — Patch #15
// Layout refatorado: Sidebar fixa no desktop, BottomNav no mobile, PageTransition entre páginas.

import { useState, useEffect } from "react";
import { useOmniStore } from "./lib/store";
import { usePluginBootstrap } from "./hooks/usePluginBootstrap";
import { useTVNavigation } from "./hooks/useTVNavigation";
import { useTVCursor } from "./hooks/useTVCursor";
import { useServiceWorker } from "./hooks/useServiceWorker";
import { useAuth } from "./hooks/useAuth";
import { Navbar } from "./components/ui/Navbar";
import { Sidebar, BottomNav } from "./components/ui/Sidebar";
import { ToastContainer } from "./components/ui/Toast";
import { FocusRing } from "./components/ui/FocusRing";
import { TVOverlay } from "./components/ui/TVOverlay";
import { PageTransition } from "./components/ui/PageTransition";
import { LibraryPage }    from "./pages/LibraryPage";
import { ExtensionsPage } from "./pages/ExtensionsPage";
import { SettingsPage }   from "./pages/SettingsPage";
import { ProfilePage }    from "./pages/ProfilePage";
import { SearchPage }     from "./pages/SearchPage";
import { CategoryPage }   from "./pages/CategoryPage";
import { CommunityPage }  from "./pages/CommunityPage";
import { ShopPage }       from "./pages/ShopPage";
import { AdminPage }      from "./pages/AdminPage";
import { RankingPage }    from "./pages/RankingPage";
import { SecurityPage }   from "./pages/SecurityPage";
import { SupportPage }    from "./pages/SupportPage";
import { PrivacyPage }    from "./pages/PrivacyPage";

export function AppContent() {
  const activeTab  = useOmniStore((s) => s.activeTab);
  const settings   = useOmniStore((s) => s.settings);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Scroll para o topo ao trocar de página
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const bootstrap = usePluginBootstrap();

  useEffect(() => {
    document.body.classList.toggle("tv-mode", settings.tvMode);
  }, [settings.tvMode]);

  useTVNavigation();
  useTVCursor();
  useServiceWorker();

  const { refreshSession } = useAuth();
  useEffect(() => { refreshSession(); }, []);

  const pages = {
    library:    <LibraryPage />,
    discover:   <LibraryPage />,   // alias — LibraryPage gerencia a aba interna
    extensions: <ExtensionsPage />,
    settings:   <SettingsPage />,
    profile:    <ProfilePage />,
    search:     <SearchPage />,
    categories: <CategoryPage />,
    community:  <CommunityPage />,
    shop:       <ShopPage />,
    admin:      <AdminPage />,
    ranking:    <RankingPage />,
    security:   <SecurityPage />,
    support:    <SupportPage />,
    privacy:    <PrivacyPage />,
  };

  // Largura do sidebar para offset do conteúdo
  const sidebarWidth = sidebarCollapsed ? "lg:pl-[60px]" : "lg:pl-56";

  return (
    <div className="noise-bg min-h-dvh bg-om-bg relative">
      <Navbar />

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      {/* Bootstrap banner */}
      {!bootstrap.ready && (
        <div className={`fixed top-14 inset-x-0 z-40 bg-om-accent/10 border-b border-om-accent/20
                         px-4 py-2 flex items-center justify-center gap-2 ${sidebarWidth} transition-all duration-300`}>
          <span className="w-3 h-3 rounded-full bg-om-accent animate-pulse" />
          <p className="text-xs text-om-accent font-medium">Carregando extensões instaladas…</p>
        </div>
      )}

      {/* Main content — offset pelo sidebar no desktop, padding bottom para bottom nav no mobile */}
      <main className={`pt-14 pb-20 lg:pb-8 ${sidebarWidth} transition-all duration-300 ${!bootstrap.ready ? "mt-9" : ""}`}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <PageTransition pageKey={activeTab}>
            {pages[activeTab] ?? <LibraryPage />}
          </PageTransition>
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <BottomNav />

      <FocusRing />
      <TVOverlay />
      <ToastContainer />
    </div>
  );
}
