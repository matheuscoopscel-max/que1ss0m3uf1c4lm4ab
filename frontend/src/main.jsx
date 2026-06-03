// FILE: frontend/src/main.jsx — Patch #9
// Adicionado: registro do Service Worker, leitura do parâmetro ?tab= da URL.

import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";
import { useOmniStore } from "./lib/store";

// ── Lazy loading de AppContent ────────────────────────────────────────────────
// Separa o bundle principal do app shell para carregamento mais rápido.
const AppContent = lazy(() =>
  import("./AppContent").then((m) => ({ default: m.AppContent }))
);

// ── Lê parâmetro ?tab= da URL (suporte a PWA shortcuts) ──────────────────────
function initTabFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  if (tab && ["library", "extensions", "settings"].includes(tab)) {
    useOmniStore.getState().setActiveTab(tab);
  }
}

initTabFromUrl();

// ── Fallback de carregamento ──────────────────────────────────────────────────
function LoadingFallback() {
  return (
    <div className="min-h-dvh bg-om-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-om-accent/20 flex items-center justify-center animate-pulse">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-om-accent">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v8a1 1 0 00.553.894l4 2A1 1 0 0020 18V6a1 1 0 00-1.447-.894l-4 2z" />
          </svg>
        </div>
        <p className="text-om-muted text-sm font-mono">carregando…</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Suspense fallback={<LoadingFallback />}>
      <AppContent />
    </Suspense>
  </React.StrictMode>
);
