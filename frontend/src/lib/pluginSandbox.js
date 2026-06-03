// FILE: frontend/src/lib/pluginSandbox.js
// OmniMedia — Sandbox de plugins via iframe isolado (Patch #9).
//
// Arquitetura:
//   Cada plugin executa dentro de um <iframe sandbox> com:
//     - allow-scripts          : permite JS
//     - allow-same-origin      : necessário para fetch de recursos do mesmo domínio
//     - sem allow-forms        : bloqueia submissão de formulários
//     - sem allow-top-navigation: não pode redirecionar a página pai
//     - sem allow-popups       : não pode abrir novas janelas
//
//   Comunicação pai ↔ iframe via postMessage com um protocolo de RPC assíncrono.
//   O iframe carrega um "runner" HTML que importa o plugin e expõe seus métodos.
//
// Fallback: se o ambiente não suportar iframe sandbox (ex: Tauri com CSP restritiva),
//           recai para o método Blob URL do Patch #2.

const SANDBOX_TIMEOUT_MS = 15_000;

/** Mapa de iframes ativos: slug → { iframe, pendingCalls } */
const sandboxMap = new Map();

let callIdCounter = 0;

/**
 * Gera o HTML do runner que roda dentro do iframe.
 * Importa o plugin e expõe search/getDetails/getPagesOrStream via postMessage.
 *
 * @param {string} scriptUrl
 * @param {string} slug
 * @returns {string} HTML completo do runner
 */
function buildRunnerHTML(scriptUrl, slug) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script type="module">
// OmniMedia Plugin Runner — slug: ${slug}
let plugin = null;

async function loadPlugin() {
  try {
    const mod = await import(${JSON.stringify(scriptUrl)});
    plugin = mod.default ?? mod;
    parent.postMessage({ type: 'omnimedia:ready', slug: ${JSON.stringify(slug)} }, '*');
  } catch (err) {
    parent.postMessage({
      type: 'omnimedia:error',
      slug: ${JSON.stringify(slug)},
      error: err.message
    }, '*');
  }
}

window.addEventListener('message', async (event) => {
  if (!event.data || event.data.pluginSlug !== ${JSON.stringify(slug)}) return;
  const { callId, method, args } = event.data;

  if (!plugin) {
    parent.postMessage({ type: 'omnimedia:result', callId, error: 'Plugin não carregado.' }, '*');
    return;
  }

  try {
    const result = await plugin[method](...args);
    parent.postMessage({ type: 'omnimedia:result', callId, result }, '*');
  } catch (err) {
    parent.postMessage({ type: 'omnimedia:result', callId, error: err.message }, '*');
  }
});

loadPlugin();
<\/script>
</body>
</html>`;
}

/**
 * Cria e monta um iframe sandbox para o plugin especificado.
 * @param {{ slug: string, scriptUrl: string }} meta
 * @returns {Promise<void>}
 */
export function mountSandbox({ slug, scriptUrl }) {
  return new Promise((resolve, reject) => {
    if (sandboxMap.has(slug)) { resolve(); return; }

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "display:none;width:0;height:0;border:none;position:absolute;";
    iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin"
    );

    const runnerHTML = buildRunnerHTML(scriptUrl, slug);
    const blob = new Blob([runnerHTML], { type: "text/html" });
    iframe.src = URL.createObjectURL(blob);

    const pendingCalls = new Map();
    sandboxMap.set(slug, { iframe, pendingCalls });

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout ao carregar sandbox do plugin "${slug}".`));
    }, SANDBOX_TIMEOUT_MS);

    function cleanup() {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
    }

    function onMessage(event) {
      const data = event.data;
      if (!data) return;

      if (data.type === "omnimedia:ready" && data.slug === slug) {
        cleanup();
        resolve();
        return;
      }

      if (data.type === "omnimedia:error" && data.slug === slug) {
        cleanup();
        unmountSandbox(slug);
        reject(new Error(data.error));
        return;
      }

      if (data.type === "omnimedia:result" && pendingCalls.has(data.callId)) {
        const { resolve: res, reject: rej } = pendingCalls.get(data.callId);
        pendingCalls.delete(data.callId);
        if (data.error) rej(new Error(data.error));
        else res(data.result);
      }
    }

    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
  });
}

/**
 * Chama um método do plugin via postMessage no iframe.
 * @param {string} slug
 * @param {'search'|'getDetails'|'getPagesOrStream'} method
 * @param {any[]} args
 * @returns {Promise<any>}
 */
export function callSandboxMethod(slug, method, args) {
  return new Promise((resolve, reject) => {
    const entry = sandboxMap.get(slug);
    if (!entry) {
      reject(new Error(`Sandbox do plugin "${slug}" não está montado.`));
      return;
    }

    const callId = ++callIdCounter;
    const timer = setTimeout(() => {
      entry.pendingCalls.delete(callId);
      reject(new Error(`Timeout ao chamar ${method}() no plugin "${slug}".`));
    }, SANDBOX_TIMEOUT_MS);

    entry.pendingCalls.set(callId, {
      resolve: (val) => { clearTimeout(timer); resolve(val); },
      reject:  (err) => { clearTimeout(timer); reject(err); },
    });

    entry.iframe.contentWindow?.postMessage(
      { pluginSlug: slug, callId, method, args },
      "*"
    );
  });
}

/**
 * Remove o iframe do DOM e limpa o mapa.
 * @param {string} slug
 */
export function unmountSandbox(slug) {
  const entry = sandboxMap.get(slug);
  if (!entry) return;
  try {
    URL.revokeObjectURL(entry.iframe.src);
    entry.iframe.remove();
  } catch {}
  sandboxMap.delete(slug);
}

/**
 * Verifica se o sandbox de um plugin está ativo.
 * @param {string} slug
 * @returns {boolean}
 */
export function isSandboxMounted(slug) {
  return sandboxMap.has(slug);
}
