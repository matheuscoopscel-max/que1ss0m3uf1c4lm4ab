// FILE: frontend/src/components/reader/ImageReader.jsx
// Componente principal do leitor de imagens.
// Orquestra: busca de páginas via plugin, modos cascata/paginado,
// HUD, teclado/D-Pad, fullscreen, e persistência de progresso no store.

import { useState, useEffect, useRef, useCallback } from "react";
import { useOmniStore } from "../../lib/store";
import { getPlugin, getAllPlugins } from "../../lib/pluginRegistry";
import { CascadeMode } from "./CascadeMode";
import { PagedMode } from "./PagedMode";
import { ReaderHUD } from "./ReaderHUD";
import { useReaderKeyboard } from "../../hooks/useReaderKeyboard";

/**
 * @param {{
 *   item: import('../../types/plugin').MediaDetails,
 *   chapter: import('../../types/plugin').Chapter,
 *   onClose: () => void
 * }} props
 */
export function ImageReader({ item, chapter, onClose }) {
  const settings = useOmniStore((s) => s.settings);
  const updateSettings = useOmniStore((s) => s.updateSettings);

  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const mode = settings.readerMode; // "cascade" | "paged"

  // ── Carrega páginas do capítulo via plugin ─────────────────────────────────
  useEffect(() => {
    const plugin = getPlugin(item.pluginSlug ?? item.id);

    // Tenta encontrar o plugin pelo slug do item
    const resolvedPlugin =
      plugin ??
      getPlugin(item.pluginSlug) ??
      // fallback: primeiro plugin de image-series carregado
      getAllPlugins().find((p) => p.mediaType === "image-series");

    if (!resolvedPlugin) {
      setError("Plugin não encontrado para carregar as páginas.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentPage(0);

    resolvedPlugin
      .getPagesOrStream(item.id, chapter.id)
      .then((result) => {
        if (Array.isArray(result)) {
          setPages(result);
        } else {
          setError("Este capítulo retornou um stream de vídeo, não páginas de imagem.");
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? "Erro ao carregar páginas.");
        setLoading(false);
      });
  }, [item.id, chapter.id]);

  // ── Navegação de páginas ───────────────────────────────────────────────────
  const goNext = useCallback(() => {
    setCurrentPage((p) => Math.min(p + 1, pages.length - 1));
  }, [pages.length]);

  const goPrev = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 0));
  }, []);

  const toggleMode = useCallback(() => {
    updateSettings({ readerMode: mode === "cascade" ? "paged" : "cascade" });
  }, [mode, updateSettings]);

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Teclado/D-Pad ─────────────────────────────────────────────────────────
  useReaderKeyboard({
    onNext: goNext,
    onPrev: goPrev,
    onToggleMode: toggleMode,
    onToggleFullscreen: toggleFullscreen,
    onClose,
    enabled: !loading && !error,
  });

  // ── Render: loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-om-accent border-t-transparent animate-spin" />
        <p className="text-white/60 text-sm font-mono">
          Carregando {chapter.title}…
        </p>
      </div>
    );
  }

  // ── Render: erro ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-4xl">⚠</p>
        <p className="text-white font-semibold text-center">{error}</p>
        <button
          onClick={onClose}
          className="mt-2 text-om-accent border border-om-accent/30 px-4 py-2 rounded-xl text-sm hover:bg-om-accent/10 transition-colors"
        >
          Voltar
        </button>
      </div>
    );
  }

  // ── Render: leitor ─────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black"
      style={{ touchAction: "pan-y" }}
    >
      {/* HUD flutuante */}
      <ReaderHUD
        title={item.title}
        chapterTitle={chapter.title}
        currentPage={currentPage}
        totalPages={pages.length}
        mode={mode}
        isFullscreen={isFullscreen}
        onPrev={goPrev}
        onNext={goNext}
        onPageJump={setCurrentPage}
        onToggleMode={toggleMode}
        onToggleFullscreen={toggleFullscreen}
        onClose={onClose}
      />

      {/* Conteúdo do leitor */}
      <div className="h-full">
        {mode === "cascade" ? (
          <CascadeMode
            pages={pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onLoadError={(i) => console.warn(`[Reader] Erro ao carregar página ${i + 1}`)}
          />
        ) : (
          <PagedMode
            pages={pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onLoadError={(i) => console.warn(`[Reader] Erro ao carregar página ${i + 1}`)}
          />
        )}
      </div>
    </div>
  );
}
