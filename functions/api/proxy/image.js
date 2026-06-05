export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = url.searchParams.get("url");
  
  if (!target) {
    return new Response("URL obrigatória", { status: 400 });
  }

  try {
    const res = await fetch(target, {
      headers: { "User-Agent": "OmniMedia/5.0" }
    });
    const body = await res.arrayBuffer();
    return new Response(body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "image/jpeg",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      }
    });
  } catch (e) {
    return new Response("Erro: " + e.message, { status: 502 });
  }
}
