export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = url.searchParams.get("url");
  
  if (!target || !target.startsWith("https://api.mangadex.org")) {
    return new Response(JSON.stringify({ error: "URL inválida" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const res = await fetch(target, {
      headers: { "User-Agent": "OmniMedia/5.0" }
    });
    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}
