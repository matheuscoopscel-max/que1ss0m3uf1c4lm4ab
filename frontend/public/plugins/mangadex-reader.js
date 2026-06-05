// OmniMedia Plugin — MangaDex Reader v1.1.0
// Patch #27: suporte a busca por gênero via includedTags[] da API MangaDex
// + browse sem limite (50 itens em vez de 20)

const API_BASE   = "https://api.mangadex.org";
const PROXY_BASE = "https://omnimedia-1sa.pages.dev/api/proxy/mangadex";
const COVER_BASE = "https://uploads.mangadex.org/covers";

// Cache de tags para não buscar toda vez
let _tagCache = null;

async function getTagMap() {
  if (_tagCache) return _tagCache;
  const data = await throttledFetch(`${API_BASE}/manga/tag`);
  _tagCache  = {};
  for (const tag of data.data ?? []) {
    const nameEn = tag.attributes?.name?.en?.toLowerCase() ?? "";
    _tagCache[nameEn] = tag.id;
    // Aliases PT-BR → EN
    const aliases = {
      "acao": "action", "ação": "action",
      "aventura": "adventure",
      "comedia": "comedy", "comédia": "comedy",
      "drama": "drama",
      "fantasia": "fantasy",
      "horror": "horror",
      "misterio": "mystery", "mistério": "mystery",
      "romance": "romance",
      "sci-fi": "sci-fi",
      "slice-of-life": "slice of life",
      "sobrenatural": "supernatural",
      "esportes": "sports",
      "historico": "historical", "histórico": "historical",
      "psicologico": "psychological", "psicológico": "psychological",
      "thriller": "thriller",
      "ecchi": "ecchi",
    };
    for (const [ptBr, en] of Object.entries(aliases)) {
      if (nameEn === en && !_tagCache[ptBr]) {
        _tagCache[ptBr] = tag.id;
      }
    }
  }
  return _tagCache;
}

// Throttle simples
let lastCall = 0;
async function throttledFetch(url, opts = {}) {
  const now  = Date.now();
  const wait = Math.max(0, 220 - (now - lastCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  // Route through backend proxy to avoid CORS
  const proxiedUrl = url.startsWith("https://api.mangadex.org")
    ? PROXY_BASE + "?url=" + encodeURIComponent(url)
    : url;
  const res  = await fetch(proxiedUrl, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`MangaDex API error: ${res.status}`);
  return res.json();
}

// Proxy local para contornar CORS das imagens do MangaDex
function proxyImage(url) {
  if (!url) return url;
  return `/api/proxy/image?url=${encodeURIComponent(url)}`;
}

function getCoverUrl(manga) {
  const rel = manga.relationships?.find((r) => r.type === "cover_art");
  if (!rel?.attributes?.fileName) return null;
  return proxyImage(`${COVER_BASE}/${manga.id}/${rel.attributes.fileName}.256.jpg`);
}

function toItem(manga) {
  const attrs  = manga.attributes;
  const title  = attrs.title?.["pt-br"] ?? attrs.title?.en ?? attrs.title?.["pt"] ?? Object.values(attrs.title ?? {})[0] ?? "Sem título";
  const desc   = attrs.description?.["pt-br"] ?? attrs.description?.en ?? Object.values(attrs.description ?? {})[0] ?? "";
  const tags   = (attrs.tags ?? []).map((t) => {
    const en = (t.attributes?.name?.en ?? "").toLowerCase();
    return en;
  }).filter(Boolean);

  return {
    id:          manga.id,
    title,
    coverUrl:    getCoverUrl(manga),
    description: desc,
    mediaType:   "image-series",
    tags,
    lastUpdated: attrs.updatedAt,
    pluginSlug:  "mangadex-reader",
  };
}

// Detecta se a query é um gênero/tag
function isGenreSlug(query) {
  const genres = [
    "acao","ação","aventura","comedia","comédia","drama","fantasia","horror",
    "misterio","mistério","romance","sci-fi","slice-of-life","sobrenatural",
    "esportes","historico","histórico","psicologico","psicológico","thriller","ecchi",
    "action","adventure","comedy","fantasy","mystery","supernatural",
    "sports","historical","psychological","romance",
  ];
  return genres.includes(query.toLowerCase().trim());
}

const MangaDexPlugin = {
  slug:      "mangadex-reader",
  name:      "MangaDex Reader",
  version:   "1.1.0",
  mediaType: "image-series",

  async search(query) {
    const q = (query ?? "").trim();

    // ── Browse sem query: retorna 50 populares ──────────────────────────────
    if (!q) {
      const data = await throttledFetch(
        `${API_BASE}/manga?limit=50&order[followedCount]=desc` +
        `&contentRating[]=safe&contentRating[]=suggestive` +
        `&includes[]=cover_art` +
        `&availableTranslatedLanguage[]=pt-br&availableTranslatedLanguage[]=en`
      );
      return (data.data ?? []).map(toItem);
    }

    // ── Busca por gênero/tag ────────────────────────────────────────────────
    if (isGenreSlug(q)) {
      const tagMap = await getTagMap();
      const tagId  = tagMap[q.toLowerCase()];

      if (tagId) {
        const data = await throttledFetch(
          `${API_BASE}/manga?limit=50&includedTags[]=${tagId}` +
          `&order[relevance]=desc` +
          `&contentRating[]=safe&contentRating[]=suggestive` +
          `&includes[]=cover_art` +
          `&availableTranslatedLanguage[]=pt-br&availableTranslatedLanguage[]=en`
        );
        return (data.data ?? []).map(toItem);
      }
    }

    // ── Busca por título ────────────────────────────────────────────────────
    const data = await throttledFetch(
      `${API_BASE}/manga?title=${encodeURIComponent(q)}&limit=30` +
      `&contentRating[]=safe&contentRating[]=suggestive` +
      `&includes[]=cover_art` +
      `&availableTranslatedLanguage[]=pt-br&availableTranslatedLanguage[]=en`
    );
    return (data.data ?? []).map(toItem);
  },

  async getDetails(id) {
    const [mangaData, chaptersData] = await Promise.all([
      throttledFetch(`${API_BASE}/manga/${id}?includes[]=cover_art&includes[]=author`),
      throttledFetch(
        `${API_BASE}/manga/${id}/feed?translatedLanguage[]=pt-br&translatedLanguage[]=en` +
        `&order[chapter]=asc&limit=500&contentRating[]=safe&contentRating[]=suggestive`
      ),
    ]);

    const manga     = mangaData.data;
    const item      = toItem(manga);
    const authorRel = manga.relationships?.find((r) => r.type === "author");
    const author    = authorRel?.attributes?.name ?? "Desconhecido";

    const chapters = (chaptersData.data ?? []).map((ch) => {
      const a       = ch.attributes;
      const langFlag = a.translatedLanguage === "pt-br" ? "🇧🇷" : "🇺🇸";
      return {
        id:          ch.id,
        title:       `${langFlag} ${a.chapter ? `Cap. ${a.chapter}` : "One-shot"}${a.title ? ` — ${a.title}` : ""}`,
        number:      parseFloat(a.chapter ?? "0"),
        releaseDate: a.publishAt,
        lang:        a.translatedLanguage,
      };
    });

    // Remove duplicados preferindo pt-br
    const seen = new Map();
    for (const ch of chapters) {
      const key = ch.number;
      if (!seen.has(key) || ch.lang === "pt-br") seen.set(key, ch);
    }

    return {
      ...item,
      authors:  [author],
      chapters: Array.from(seen.values()),
    };
  },

  async getPagesOrStream(mangaId, chapterId) {
    const data = await throttledFetch(`${API_BASE}/at-home/server/${chapterId}`);
    const { baseUrl, chapter } = data;
    if (!chapter?.data) throw new Error("Capítulo sem páginas disponíveis.");
    return chapter.data.map(
      (filename) => proxyImage(`${baseUrl}/data/${chapter.hash}/${filename}`)
    );
  },
};

export default MangaDexPlugin;
