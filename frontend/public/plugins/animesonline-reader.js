// OmniMedia Plugin — AnimesOnline Reader v1.0.0
// Fonte: animesonlinecc.to — animes legendados e dublados em PT-BR
// Scraping via proxy da VPS (Cloudflare Pages Function)

const BASE_URL  = "https://animesonlinecc.to";
const PROXY_URL = "https://omnimedia-1sa.pages.dev/api/proxy/scraper";

async function scrapedFetch(url) {
  const res = await fetch(`${PROXY_URL}?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`Scraper error: ${res.status}`);
  return res.text();
}

// Parser HTML simples sem DOMParser (não disponível em todos os ambientes sandbox)
function extractMeta(html, property) {
  const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))
             || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'));
  return match ? match[1] : null;
}

function extractLinks(html, pattern) {
  const results = [];
  const regex = new RegExp(pattern, 'gi');
  let match;
  while ((match = regex.exec(html)) !== null) {
    results.push(match);
  }
  return results;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&#8211;/g, '–');
}

const AnimesOnlinePlugin = {
  slug:      "animesonline-reader",
  name:      "AnimesOnline",
  version:   "1.0.0",
  mediaType: "video-stream",

  async search(query) {
    const q = (query ?? "").trim();
    let html;

    if (!q) {
      // Browse: lista recente
      html = await scrapedFetch(`${BASE_URL}/anime/`);
    } else {
      html = await scrapedFetch(`${BASE_URL}/?s=${encodeURIComponent(q)}`);
    }

    const items = [];
    // Extrai cards de anime — formato: <div class="poster"> com link e imagem
    const cardPattern = /<article[^>]*class="[^"]*TPost[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    const cards = extractLinks(html, '<article[^>]*class="[^"]*TPost[^"]*"[^>]*>[\\s\\S]*?<\\/article>');

    // Fallback: extrai direto dos links de anime
    const linkPattern = /<a[^>]+href=["'](https?:\/\/animesonlinecc\.to\/anime\/[^"'\/]+\/?)["'][^>]*>\s*(?:<img[^>]+src=["']([^"']+)["'][^>]*>)?\s*(?:.*?<h2[^>]*class="[^"]*Title[^"]*"[^>]*>(.*?)<\/h2>)?/gi;
    let match;
    const seen = new Set();

    while ((match = linkPattern.exec(html)) !== null) {
      const url   = match[1];
      const img   = match[2] ?? null;
      const title = match[3] ? decodeHtmlEntities(match[3].replace(/<[^>]+>/g, '').trim()) : null;

      if (!url || seen.has(url)) continue;
      seen.add(url);

      const slug = url.replace(`${BASE_URL}/anime/`, '').replace(/\/$/, '');
      if (!slug || slug.includes('/')) continue;

      items.push({
        id:        slug,
        title:     title ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        coverUrl:  img ?? null,
        mediaType: "video-stream",
        pluginSlug: "animesonline-reader",
        description: "",
        tags: [],
      });

      if (items.length >= 30) break;
    }

    return items;
  },

  async getDetails(id) {
    const html = await scrapedFetch(`${BASE_URL}/anime/${id}/`);

    const title       = extractMeta(html, 'og:title') ?? id.replace(/-/g, ' ');
    const description = extractMeta(html, 'og:description') ?? '';
    const coverUrl    = extractMeta(html, 'og:image') ?? null;

    // Extrai gêneros
    const genreMatches = [...html.matchAll(/class="[^"]*Genre[^"]*"[^>]*>\s*<a[^>]+>([^<]+)<\/a>/gi)];
    const tags = genreMatches.map(m => m[1].trim().toLowerCase());

    // Extrai episódios
    const episodes = [];
    const epPattern = /<a[^>]+href=["'](https?:\/\/animesonlinecc\.to\/episodio\/([^"']+?)\/)["'][^>]*>[\s\S]*?(?:Epis[oó]dio?\s*(\d+)|EP\.?\s*(\d+))/gi;
    let epMatch;
    const epSeen = new Set();

    while ((epMatch = epPattern.exec(html)) !== null) {
      const epUrl  = epMatch[1];
      const epSlug = epMatch[2];
      const epNum  = parseInt(epMatch[3] ?? epMatch[4] ?? '0', 10);

      if (epSeen.has(epSlug)) continue;
      epSeen.add(epSlug);

      episodes.push({
        id:     epSlug,
        title:  `Episódio ${epNum || epSeen.size}`,
        number: epNum || epSeen.size,
      });
    }

    // Ordena episódios
    episodes.sort((a, b) => a.number - b.number);

    return {
      id,
      title:       decodeHtmlEntities(title.replace(' - Animes Online', '').trim()),
      description: decodeHtmlEntities(description),
      coverUrl,
      mediaType:   "video-stream",
      pluginSlug:  "animesonline-reader",
      tags,
      chapters:    episodes, // OmniMedia usa "chapters" para episódios também
    };
  },

  async getPagesOrStream(animeId, episodeId) {
    const html = await scrapedFetch(`${BASE_URL}/episodio/${episodeId}/`);

    // Extrai iframe do player
    const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["'][^>]*>/i);
    if (iframeMatch) {
      return iframeMatch[1]; // Retorna URL do stream
    }

    // Tenta extrair player direto
    const playerMatch = html.match(/file:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
    if (playerMatch) {
      return playerMatch[1];
    }

    throw new Error("Player não encontrado neste episódio.");
  },
};

export default AnimesOnlinePlugin;
