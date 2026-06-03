// FILE: frontend/src/lib/api.js
// Cliente HTTP centralizado para o backend OmniMedia.
// Injeta o Bearer token automaticamente e tenta refresh quando recebe 401.

import { getApiBaseUrl } from "./platform.js";

let accessToken = null;
let isRefreshing = false;
let refreshQueue = []; // callbacks aguardando o refresh

/**
 * Seta o access token em memória (chamado após login/refresh).
 * @param {string|null} token
 */
export function setAccessToken(token) {
  accessToken = token;
}

/**
 * Retorna o access token atual.
 * @returns {string|null}
 */
export function getAccessToken() {
  return accessToken;
}

/**
 * Tenta renovar o access token via /api/auth/refresh (usa o httpOnly cookie).
 * @returns {Promise<string|null>} novo accessToken ou null se falhar
 */
async function refreshAccessToken() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method:      "POST",
      credentials: "include", // envia o cookie httpOnly
    });

    if (!res.ok) {
      accessToken = null;
      return null;
    }

    const data = await res.json();
    accessToken = data.accessToken;
    return accessToken;
  } catch {
    accessToken = null;
    return null;
  }
}

/**
 * Wrapper de fetch que:
 *  1. Injeta Authorization: Bearer <token>
 *  2. Se receber 401, tenta refresh uma vez
 *  3. Se refresh falhar, limpa o token e retorna o 401 original
 *
 * @param {string} path — path relativo (ex: "/me" → GET /api/me)
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  const base = getApiBaseUrl();
  const url  = `${base}${path}`;

  const makeRequest = (token) =>
    fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let res = await makeRequest(accessToken);

  // Token expirado — tenta refresh uma vez
  if (res.status === 401 && accessToken) {
    if (isRefreshing) {
      // Outro refresh já está em curso — enfileira este request
      return new Promise((resolve) => {
        refreshQueue.push((newToken) => resolve(makeRequest(newToken)));
      });
    }

    isRefreshing = true;
    const newToken = await refreshAccessToken();
    isRefreshing = false;

    // Resolve a fila com o novo token
    refreshQueue.forEach((cb) => cb(newToken));
    refreshQueue = [];

    if (newToken) {
      res = await makeRequest(newToken);
    }
  }

  return res;
}

/**
 * Atalhos tipados para os métodos HTTP mais comuns.
 */
export const api = {
  get:    (path, opts)       => apiFetch(path, { method: "GET",    ...opts }),
  post:   (path, body, opts) => apiFetch(path, { method: "POST",   body: JSON.stringify(body), ...opts }),
  patch:  (path, body, opts) => apiFetch(path, { method: "PATCH",  body: JSON.stringify(body), ...opts }),
  delete: (path, opts)       => apiFetch(path, { method: "DELETE", ...opts }),
};
