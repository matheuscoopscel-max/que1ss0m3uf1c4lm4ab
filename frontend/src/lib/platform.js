// FILE: frontend/src/lib/platform.js
// Detecção de plataforma em runtime.
// Usado para adaptar comportamentos específicos (CSP, plugins nativos, etc.).

/**
 * true quando rodando dentro do Tauri (Desktop: Windows/Linux/macOS).
 * O Tauri injeta `window.__TAURI__` em todos os contextos.
 */
export const isTauri =
  typeof window !== "undefined" && "__TAURI__" in window;

/**
 * true quando rodando dentro do Capacitor (Android / Android TV / iOS).
 * O Capacitor injeta `window.Capacitor` com o objeto de plataforma.
 */
export const isCapacitor =
  typeof window !== "undefined" &&
  "Capacitor" in window &&
  // @ts-ignore
  window.Capacitor?.isNativePlatform?.() === true;

/**
 * true em Android TV e outros ambientes de TV.
 * Detecta via:
 *  1. User-Agent contendo "TV" ou "SmartTV" ou "CrKey" (Chromecast)
 *  2. URL param ?tv=1 (útil para emuladores / debug)
 *  3. window.__OMNIMEDIA_TV__ injetado por wrappers nativos
 */
export const isTV = (() => {
  if (typeof window === "undefined") return false;
  if ("__OMNIMEDIA_TV__" in window) return true;
  if (new URLSearchParams(window.location.search).get("tv") === "1") return true;
  const ua = navigator.userAgent ?? "";
  return /\bAndroidTV\b|\bSmartTV\b|\bTV\b|\bCrKey\b|\bNetcast\b|\bTizen\b|\bWebOS\b/i.test(ua);
})();

/**
 * true quando rodando num ambiente web comum (browser).
 */
export const isWeb = !isTauri && !isCapacitor;

/**
 * Plataforma atual como string legível.
 * @returns {'tauri-desktop' | 'capacitor-android' | 'capacitor-tv' | 'web'}
 */
export function getPlatformName() {
  if (isTauri) return "tauri-desktop";
  if (isCapacitor && isTV) return "capacitor-tv";
  if (isCapacitor) return "capacitor-android";
  return "web";
}

/**
 * Retorna a URL base da API de acordo com a plataforma.
 * No Tauri/Capacitor, o proxy do Vite não existe — precisa da URL absoluta do servidor.
 */
export function getApiBaseUrl() {
  // Variável de ambiente tem prioridade sempre
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

  // Em builds nativas, o app não tem servidor local — aponta para VPS
  if (isTauri || isCapacitor) {
    return import.meta.env.VITE_API_URL_NATIVE ?? "http://localhost:3001/api";
  }

  // Web: usa proxy do Vite em dev, path relativo em produção
  return "/api";
}
