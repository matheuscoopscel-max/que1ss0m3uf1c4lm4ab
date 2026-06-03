// FILE: frontend/src/components/player/VideoPlayer.jsx
// Componente principal do player de vídeo.
// Orquestra: busca do stream via plugin, HLS.js, controles customizados,
// teclado e fullscreen. Renderizado como overlay fixed sobre toda a tela.

import { useRef, useCallback, useEffect } from "react";
import { getPlugin, getAllPlugins } from "../../lib/pluginRegistry";
import { useVideoPlayer } from "../../hooks/useVideoPlayer";
import { usePlayerKeyboard } from "../../hooks/usePlayerKeyboard";
import { PlayerControls } from "./PlayerControls";
import { useState } from "react";

/**
 * @param {{
 *   item: import('../../types/plugin').MediaDetails,
 *   chapter: import('../../types/plugin').Chapter,
 *   onClose: () => void
 * }} props
 */
export function VideoPlayer({ item, chapter, onClose }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [streamInfo, setStreamInfo] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  // ── Busca a URL do stream via plugin ──────────────────────────────────────
  useEffect(() => {
    const plugin =
      getPlugin(item.pluginSlug) ??
      getAllPlugins().find((p) => p.mediaType === "video-stream");

    if (!plugin) {
      setFetchError("Plugin de vídeo não encontrado ou não está carregado.");
      setFetchLoading(false);
      return;
    }

    setFetchLoading(true);
    setFetchError(null);

    plugin
      .getPagesOrStream(item.id, chapter.id)
      .then((result) => {
        if (Array.isArray(result)) {
          setFetchError("Este item retornou páginas de imagem, não um stream de vídeo.");
        } else {
          setStreamInfo(result);
        }
        setFetchLoading(false);
      })
      .catch((err) => {
        setFetchError(err.message ?? "Erro ao obter URL do stream.");
        setFetchLoading(false);
      });
  }, [item.id, chapter.id, item.pluginSlug]);

  // ── Hook do player (estado + HLS.js) ─────────────────────────────────────
  const player = useVideoPlayer({ streamInfo, videoRef });

  // ── Fullscreen delegado ao container ─────────────────────────────────────
  const handleToggleFullscreen = useCallback(() => {
    player.toggleFullscreen(containerRef);
  }, [player]);

  // ── Teclado ───────────────────────────────────────────────────────────────
  usePlayerKeyboard({
    onTogglePlay: player.togglePlay,
    onSkipBack: () => player.skip(-10),
    onSkipForward: () => player.skip(10),
    onVolumeUp: () => player.changeVolume(player.volume + 0.1),
    onVolumeDown: () => player.changeVolume(player.volume - 0.1),
    onToggleMute: player.toggleMute,
    onToggleFullscreen: handleToggleFullscreen,
    onClose,
    enabled: !fetchLoading && !fetchError,
  });

  // ── Auto-play quando stream estiver pronto ────────────────────────────────
  useEffect(() => {
    if (!streamInfo) return;
    const video = videoRef.current;
    if (video) {
      // Pequeno delay para o HLS.js anexar a fonte
      const t = setTimeout(() => video.play().catch(() => {}), 600);
      return () => clearTimeout(t);
    }
  }, [streamInfo]);

  // ── Render: carregando stream info ────────────────────────────────────────
  if (fetchLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-om-accent border-t-transparent animate-spin" />
        <p className="text-white/60 text-sm font-mono">Obtendo stream…</p>
      </div>
    );
  }

  // ── Render: erro ──────────────────────────────────────────────────────────
  if (fetchError || player.error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-4xl">📡</p>
        <p className="text-white font-semibold">{fetchError ?? player.error}</p>
        <button
          onClick={onClose}
          className="mt-2 text-om-accent border border-om-accent/30 px-4 py-2 rounded-xl text-sm hover:bg-om-accent/10 transition-colors"
        >
          Voltar
        </button>
      </div>
    );
  }

  // ── Render: player ────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onClick={(e) => {
        // Clique no fundo (não nos controles) faz play/pause
        if (e.target === e.currentTarget || e.target === videoRef.current) {
          player.togglePlay();
        }
      }}
    >
      {/* Elemento de vídeo nativo — HLS.js anexa aqui */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        preload="metadata"
      />

      {/* Controles sobrepostos */}
      <PlayerControls
        title={item.title}
        playing={player.playing}
        currentTime={player.currentTime}
        duration={player.duration}
        volume={player.volume}
        muted={player.muted}
        buffered={player.buffered}
        isFullscreen={player.isFullscreen}
        isLoading={player.isLoading}
        qualities={player.qualities}
        currentQuality={player.currentQuality}
        onTogglePlay={player.togglePlay}
        onSeek={player.seek}
        onSkip={player.skip}
        onChangeVolume={player.changeVolume}
        onToggleMute={player.toggleMute}
        onToggleFullscreen={handleToggleFullscreen}
        onSetQuality={player.setQuality}
        onClose={onClose}
      />
    </div>
  );
}
