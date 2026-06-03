// FILE: frontend/src/components/player/PlayerControls.jsx
// Controles customizados do player de vídeo.
// Renderizado sobre o <video> como overlay posicionado absolutamente.
// Auto-oculta após 3s de inatividade (exceto quando pausado).

import { useState, useEffect, useRef, useCallback } from "react";

/** Converte segundos para "HH:MM:SS" ou "MM:SS" */
function formatTime(secs) {
  if (!isFinite(secs) || secs < 0) return "0:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * @param {{
 *   title: string,
 *   playing: boolean,
 *   currentTime: number,
 *   duration: number,
 *   volume: number,
 *   muted: boolean,
 *   buffered: number,
 *   isFullscreen: boolean,
 *   isLoading: boolean,
 *   qualities: Array<{id:number, label:string}>,
 *   currentQuality: number,
 *   onTogglePlay: () => void,
 *   onSeek: (s: number) => void,
 *   onSkip: (delta: number) => void,
 *   onChangeVolume: (v: number) => void,
 *   onToggleMute: () => void,
 *   onToggleFullscreen: () => void,
 *   onSetQuality: (id: number) => void,
 *   onClose: () => void
 * }} props
 */
export function PlayerControls({
  title,
  playing, currentTime, duration,
  volume, muted, buffered,
  isFullscreen, isLoading,
  qualities, currentQuality,
  onTogglePlay, onSeek, onSkip,
  onChangeVolume, onToggleMute,
  onToggleFullscreen, onSetQuality,
  onClose,
}) {
  const [visible, setVisible] = useState(true);
  const [showQuality, setShowQuality] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(null);
  const hideTimerRef = useRef(null);
  const progressRef = useRef(null);

  // ── Auto-hide ──────────────────────────────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimerRef.current);
    // Mantém visível quando pausado
    if (playing) {
      hideTimerRef.current = setTimeout(() => setVisible(false), 3000);
    }
  }, [playing]);

  useEffect(() => {
    resetHideTimer();
  }, [playing, resetHideTimer]);

  useEffect(() => {
    const events = ["mousemove", "touchstart", "keydown"];
    events.forEach((e) => window.addEventListener(e, resetHideTimer));
    return () => {
      clearTimeout(hideTimerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetHideTimer));
    };
  }, [resetHideTimer]);

  // ── Scrubber (barra de progresso) ──────────────────────────────────────────
  function calcSeekTime(e) {
    const bar = progressRef.current;
    if (!bar || !duration) return null;
    const rect = bar.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  }

  const handleProgressPointerDown = (e) => {
    e.preventDefault();
    setScrubbing(true);
    const t = calcSeekTime(e);
    if (t !== null) setScrubTime(t);
  };

  const handleProgressPointerMove = useCallback((e) => {
    if (!scrubbing) return;
    const t = calcSeekTime(e);
    if (t !== null) setScrubTime(t);
  }, [scrubbing, duration]);

  const handleProgressPointerUp = useCallback((e) => {
    if (!scrubbing) return;
    setScrubbing(false);
    const t = calcSeekTime(e);
    if (t !== null) { onSeek(t); setScrubTime(null); }
  }, [scrubbing, duration, onSeek]);

  useEffect(() => {
    if (!scrubbing) return;
    window.addEventListener("pointermove", handleProgressPointerMove);
    window.addEventListener("pointerup", handleProgressPointerUp);
    return () => {
      window.removeEventListener("pointermove", handleProgressPointerMove);
      window.removeEventListener("pointerup", handleProgressPointerUp);
    };
  }, [scrubbing, handleProgressPointerMove, handleProgressPointerUp]);

  const displayTime = scrubTime !== null ? scrubTime : currentTime;
  const progress = duration > 0 ? displayTime / duration : 0;

  const currentQualityLabel =
    currentQuality === -1
      ? "Auto"
      : qualities.find((q) => q.id === currentQuality)?.label ?? "Auto";

  return (
    <div
      className={`absolute inset-0 z-10 flex flex-col justify-between transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ cursor: visible ? "default" : "none" }}
    >
      {/* ── Barra superior ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={onClose}
          className="tv-focusable shrink-0 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="Fechar player"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <p className="flex-1 text-white font-display font-semibold text-sm leading-none truncate">
          {title}
        </p>
      </div>

      {/* ── Centro: spinner de loading ──────────────────────────────────────── */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full border-2 border-om-accent border-t-transparent animate-spin" />
        </div>
      )}

      {/* ── Barra inferior ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-10 space-y-3">

        {/* Scrubber */}
        <div
          ref={progressRef}
          className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group"
          onPointerDown={handleProgressPointerDown}
        >
          {/* Buffer */}
          <div
            className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
            style={{ width: `${buffered * 100}%` }}
          />
          {/* Progresso */}
          <div
            className="absolute inset-y-0 left-0 bg-om-accent rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
          {/* Thumb */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-om-accent rounded-full shadow-lg
                        transition-transform ${scrubbing ? "scale-125" : "scale-0 group-hover:scale-100"}`}
            style={{ left: `calc(${progress * 100}% - 7px)` }}
          />
        </div>

        {/* Controles inferiores */}
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className="tv-focusable w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
            aria-label={playing ? "Pausar" : "Reproduzir"}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Retroceder 10s */}
          <button
            onClick={() => onSkip(-10)}
            className="tv-focusable w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white text-xs font-mono shrink-0"
            aria-label="Retroceder 10 segundos"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M9.195 18.44c1.25.714 2.805-.189 2.805-1.629v-2.34l6.945 3.968c1.25.715 2.805-.188 2.805-1.628V8.69c0-1.44-1.555-2.343-2.805-1.628L12 11.029v-2.34c0-1.44-1.555-2.343-2.805-1.628l-7.108 4.061c-1.26.72-1.26 2.536 0 3.256l7.108 4.061Z" />
            </svg>
          </button>

          {/* Avançar 10s */}
          <button
            onClick={() => onSkip(10)}
            className="tv-focusable w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white shrink-0"
            aria-label="Avançar 10 segundos"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M5.055 7.06C3.805 6.347 2.25 7.25 2.25 8.69v8.122c0 1.44 1.555 2.343 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.343 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256L14.805 7.06C13.555 6.347 12 7.25 12 8.69v2.34L5.055 7.06Z" />
            </svg>
          </button>

          {/* Tempo */}
          <span className="text-white/70 text-xs font-mono tabular-nums shrink-0">
            {formatTime(displayTime)}{" "}
            <span className="text-white/40">/</span>{" "}
            {formatTime(duration)}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Volume */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              onClick={onToggleMute}
              className="tv-focusable w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label={muted ? "Ativar som" : "Silenciar"}
            >
              {muted || volume === 0 ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white/70">
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 1 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" />
                </svg>
              ) : volume < 0.5 ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white/70">
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white/70">
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Zm-2.196 2.196a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={muted ? 0 : volume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              className="w-20 accent-om-accent cursor-pointer"
              aria-label="Volume"
            />
          </div>

          {/* Seletor de qualidade (apenas HLS) */}
          {qualities.length > 0 && (
            <div className="relative shrink-0">
              <button
                onClick={() => setShowQuality((v) => !v)}
                className="tv-focusable px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-colors"
              >
                {currentQualityLabel}
              </button>
              {showQuality && (
                <div className="absolute bottom-full right-0 mb-2 bg-om-card border border-om-border rounded-xl overflow-hidden shadow-xl min-w-[90px]">
                  <button
                    onClick={() => { onSetQuality(-1); setShowQuality(false); }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      currentQuality === -1
                        ? "text-om-accent bg-om-accent/10"
                        : "text-om-text hover:bg-om-surface"
                    }`}
                  >
                    Auto
                  </button>
                  {qualities.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => { onSetQuality(q.id); setShowQuality(false); }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        currentQuality === q.id
                          ? "text-om-accent bg-om-accent/10"
                          : "text-om-text hover:bg-om-surface"
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fullscreen */}
          <button
            onClick={onToggleFullscreen}
            className="tv-focusable w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
            aria-label={isFullscreen ? "Sair do fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
