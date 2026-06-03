// FILE: frontend/src/hooks/useVideoPlayer.js
// Hook central do player de vídeo.
// Gerencia: estado do vídeo (play/pause/seek/volume/mute/fullscreen),
// integração com HLS.js para streams .m3u8, fallback para MP4 direto,
// e injeção de headers customizados quando o plugin os fornece.

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * @param {{
 *   streamInfo: import('../types/plugin').StreamUrl | null,
 *   videoRef: React.RefObject<HTMLVideoElement>
 * }} opts
 */
export function useVideoPlayer({ streamInfo, videoRef }) {
  const hlsRef = useRef(null);

  // ── Estado exposto ao componente ───────────────────────────────────────────
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffered, setBuffered] = useState(0);  // 0–1
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qualities, setQualities] = useState([]);       // níveis HLS disponíveis
  const [currentQuality, setCurrentQualityState] = useState(-1); // -1 = auto

  // ── Inicializa a fonte de vídeo ────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamInfo) return;

    setIsLoading(true);
    setError(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setQualities([]);
    setCurrentQualityState(-1);

    // Destrói instância HLS anterior
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const { type, url } = streamInfo;

    if (type === "hls") {
      // ── HLS via hls.js ─────────────────────────────────────────────────
      import("hls.js").then(({ default: Hls }) => {
        if (!Hls.isSupported()) {
          // Safari suporta HLS nativamente via <video src>
          video.src = url;
          video.load();
          return;
        }

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
        });

        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        // Disponibiliza os níveis de qualidade quando o manifesto carrega
        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          const levels = data.levels.map((l, i) => ({
            id: i,
            label: l.height ? `${l.height}p` : `Nível ${i + 1}`,
            bitrate: l.bitrate,
          }));
          setQualities(levels);
          setCurrentQualityState(-1); // começa em auto
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad(); // tenta recuperar
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                setError(`Erro HLS: ${data.details}`);
                break;
            }
          }
        });
      });
    } else {
      // ── MP4 / DASH direto ──────────────────────────────────────────────
      video.src = url;
      video.load();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamInfo, videoRef]);

  // ── Event listeners do elemento <video> ────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Calcula buffered como fração do duration
      if (video.buffered.length > 0 && video.duration > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1) / video.duration);
      }
    };
    const onDurationChange = () => setDuration(video.duration || 0);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onError = () => {
      const code = video.error?.code;
      const msgs = {
        1: "Reprodução interrompida pelo usuário.",
        2: "Erro de rede ao carregar o vídeo.",
        3: "Erro de decodificação do vídeo.",
        4: "Formato de vídeo não suportado.",
      };
      setError(msgs[code] ?? "Erro desconhecido ao reproduzir.");
      setIsLoading(false);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
    };
  }, [videoRef]);

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Ações ──────────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    playing ? video.pause() : video.play().catch(() => {});
  }, [playing, videoRef]);

  const seek = useCallback((seconds) => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(seconds, video.duration));
  }, [videoRef]);

  const skip = useCallback((delta) => {
    const video = videoRef.current;
    if (!video) return;
    seek(video.currentTime + delta);
  }, [videoRef, seek]);

  const changeVolume = useCallback((val) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = Math.max(0, Math.min(1, val));
    if (val > 0) video.muted = false;
  }, [videoRef]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, [videoRef]);

  const toggleFullscreen = useCallback(async (containerRef) => {
    const el = containerRef?.current ?? videoRef.current;
    if (!document.fullscreenElement) {
      await el?.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  }, [videoRef]);

  const setQuality = useCallback((levelId) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelId; // -1 = auto
    setCurrentQualityState(levelId);
  }, []);

  return {
    // Estado
    playing, currentTime, duration, volume, muted,
    buffered, isFullscreen, isLoading, error,
    qualities, currentQuality,
    // Ações
    togglePlay, seek, skip, changeVolume, toggleMute,
    toggleFullscreen, setQuality,
  };
}
