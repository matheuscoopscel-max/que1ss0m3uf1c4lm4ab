// Cloudflare Pages Function — /api/proxy/scraper
// Faz scraping de HTML externo evitando CORS do browser

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = url.searchParams.get("url");

  // CORS preflight
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  }

  if (!target) {
    return new Response(JSON.stringify({ error: "URL obrigatória" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  // Whitelist de domínios permitidos
  const allowed = [
    "animesonlinecc.to",
    "nhentaibr.com",
    "redecanais.nexus",
    "redecanais.bz",
    "api.mangadex.org",
  ];

  const targetHost = new URL(target).hostname;
  if (!allowed.some(d => targetHost === d || targetHost.endsWith('.' + d))) {
    return new Response(JSON.stringify({ error: "Domínio não permitido: " + targetHost }), {
      status: 403,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const res = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "Referer": new URL(target).origin + "/",
      }
    });

    const contentType = res.headers.get("Content-Type") ?? "text/html";
    const body = await res.text();

    return new Response(body, {
      status: res.status,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300", // 5 min cache
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
