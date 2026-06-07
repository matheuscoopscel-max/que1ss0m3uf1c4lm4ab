// OmniMedia Plugin — NHentaiBR Reader v1.0.0
// Fonte: nhentaibr.com — conteúdo adulto (+18)
// ⚠ CONTEÚDO ADULTO — apenas para maiores de 18 anos
// Scraping via proxy da VPS (Cloudflare Pages Function)

const BASE_URL  = "https://nhentaibr.com";
const PROXY_URL = "https://omnimedia-1sa.pages.dev/api/proxy/scraper";

async function scrapedFetch(url) {
  const res = await fetch(`${PROXY_URL}?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`Scraper error: ${res.status}`);
  return res.text();
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&ndash;/g, '–');
}

function extractMeta(html, property) {
  const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))
             || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'));
  return match ? match[1] : null;
}

const NHentaiBRPlugin = {
  slug:      "nhentaibr-reader",
  name:      "NHentaiBR (+18)",
  version:   "1.0.0",
  mediaType: "image-series",
  contentRating: "adult",

  async search(query) {
    const q = (query ?? "").trim();
    let html;

    if (!q) {
      html = await scrapedFetch(`${BASE_URL}/`);
    } else {
      html = await scrapedFetch(`${BASE_URL}/?s=${encodeURIComponent(q)}`);
    }

    const items  = [];
    const seen   = new Set();

    // Extrai cards — nhentaibr usa estrutura de galeria
    const pattern = /<a[^>]+href=["'](https?:\/\/nhentaibr\.com\/(?:hentai|manga|doujin)\/([^"'\/]+)\/?)[^"']*["'][^>]*>[\s\S]{0,500}?<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>[\s\S]{0,200}?(?:<[^>]*title[^>]*>([^<]+)<\/|<h\d[^>]*>([^<]+)<\/h\d>)?/gi;

    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url   = match[1];
      const slug  = match[2];
      const img   = match[3];
      const title = match[4] ?? match[5];

      if (!slug || seen.has(slug)) continue;
      seen.add(slug);

      items.push({
        id:          slug,
        title:       title ? decodeHtmlEntities(title.trim()) : slug.replace(/-/g, ' '),
        coverUrl:    img ?? null,
        mediaType:   "image-series",
        pluginSlug:  "nhentaibr-reader",
        contentRating: "adult",
        tags:        [],
        description: "",
      });

      if (items.length >= 24) break;
    }

    // Fallback mais simples se o pattern acima não pegar nada
    if (items.length === 0) {
      const simplePattern = /<a[^>]+href=["'](https?:\/\/nhentaibr\.com\/[^"']+\/?)["'][^>]*>\s*<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
      while ((match = simplePattern.exec(html)) !== null) {
        const url  = match[1];
        const img  = match[2];
        if (seen.has(url) || !url.match(/nhentaibr\.com\/(hentai|manga|doujin)\//)) continue;
        seen.add(url);
        const slug = url.split('/').filter(Boolean).pop();
        items.push({
          id: slug, title: slug.replace(/-/g, ' '),
          coverUrl: img, mediaType: "image-series",
          pluginSlug: "nhentaibr-reader",
          contentRating: "adult", tags: [], description: "",
        });
        if (items.length >= 24) break;
      }
    }

    return items;
  },

  async getDetails(id) {
    // Tenta diferentes prefixos de URL
    const prefixes = ['hentai', 'manga', 'doujin'];
    let html = null;
    let usedUrl = null;

    for (const prefix of prefixes) {
      try {
        const url = `${BASE_URL}/${prefix}/${id}/`;
        const h   = await scrapedFetch(url);
        if (h.includes(id) && !h.includes('404')) {
          html    = h;
          usedUrl = url;
          break;
        }
      } catch {}
    }

    if (!html) throw new Error(`Obra não encontrada: ${id}`);

    const title       = extractMeta(html, 'og:title') ?? id.replace(/-/g, ' ');
    const description = extractMeta(html, 'og:description') ?? '';
    const coverUrl    = extractMeta(html, 'og:image') ?? null;

    // Extrai tags
    const tagPattern = /<a[^>]+class="[^"]*tag[^"]*"[^>]*>([^<]+)<\/a>/gi;
    const tags = [];
    let tagMatch;
    while ((tagMatch = tagPattern.exec(html)) !== null) {
      tags.push(tagMatch[1].trim().toLowerCase());
    }

    // Extrai páginas — nhentaibr lista as páginas como thumbnails
    const pages = [];
    const pagePattern = /<img[^>]+(?:src|data-src)=["']([^"']+(?:\/page\/|\/pages\/|\/img\/)[^"']+\.(jpg|png|webp)[^"']*)["']/gi;
    let pageMatch;
    const pageSeen = new Set();

    while ((pageMatch = pagePattern.exec(html)) !== null) {
      const imgUrl = pageMatch[1];
      if (pageSeen.has(imgUrl)) continue;
      pageSeen.add(imgUrl);
      pages.push(imgUrl);
    }

    // Cria "capítulos" como uma única obra (padrão de doujinshi)
    const chapters = [{
      id:     `${id}-read`,
      title:  "Ler obra completa",
      number: 1,
      pages:  pages.length,
    }];

    return {
      id, title: decodeHtmlEntities(title.trim()),
      description: decodeHtmlEntities(description),
      coverUrl, mediaType: "image-series",
      pluginSlug: "nhentaibr-reader",
      contentRating: "adult",
      tags, chapters,
      _pages: pages, // cache interno
    };
  },

  async getPagesOrStream(workId, chapterId) {
    // Re-fetch para pegar as páginas
    const prefixes = ['hentai', 'manga', 'doujin'];
    let html = null;

    for (const prefix of prefixes) {
      try {
        const url = `${BASE_URL}/${prefix}/${workId}/`;
        const h   = await scrapedFetch(url);
        if (h.includes(workId) && !h.includes('404')) { html = h; break; }
      } catch {}
    }

    if (!html) throw new Error("Obra não encontrada.");

    // Extrai URLs das páginas em alta resolução
    const pages  = [];
    const seen   = new Set();

    // Tenta pegar links de páginas individuais primeiro
    const readPattern = /<a[^>]+href=["'](https?:\/\/nhentaibr\.com\/[^"']+\/\d+\/?)[^"']*["'][^>]*>/gi;
    let match;
    while ((match = readPattern.exec(html)) !== null) {
      const url = match[1];
      if (!seen.has(url) && url.match(/\/\d+\/?$/)) {
        seen.add(url);
      }
    }

    // Se tem links de páginas, pega as imagens de cada uma
    if (seen.size > 1) {
      const pageUrls = Array.from(seen).slice(0, 100);
      const firstPage = await scrapedFetch(pageUrls[0]);
      const imgMatch = firstPage.match(/<img[^>]+(?:id="[^"]*main[^"]*"|class="[^"]*main[^"]*")[^>]+src=["']([^"']+)["']/i)
                    || firstPage.match(/<img[^>]+src=["']([^"']+(?:\/page|full|original)[^"']+\.(jpg|png|webp))["']/i);

      if (imgMatch) {
        // Infere as demais páginas pelo padrão da URL
        const baseImg = imgMatch[1];
        const numMatch = baseImg.match(/(\d+)(\.\w+)$/);
        if (numMatch) {
          const base = baseImg.replace(/\d+(\.\w+)$/, '');
          const ext  = numMatch[2];
          for (let i = 1; i <= pageUrls.length; i++) {
            pages.push(`${PROXY_URL}?url=${encodeURIComponent(base + i + ext)}`);
          }
          return pages;
        }
      }
    }

    // Fallback: extrai thumbnails e tenta construir URL de alta resolução
    const thumbPattern = /<img[^>]+(?:src|data-src)=["']([^"']+\/(?:pages|thumbs|t)\d*\/[^"']+\.(jpg|png|webp)[^"']*)["']/gi;
    while ((match = thumbPattern.exec(html)) !== null) {
      const thumb = match[1];
      if (!seen.has(thumb)) {
        seen.add(thumb);
        // Converte thumbnail para imagem completa removendo sufixos de thumb
        const full = thumb
          .replace('/thumbs/', '/pages/')
          .replace('/t/', '/i/')
          .replace('_t.', '.')
          .replace(/\?.*$/, '');
        pages.push(`${PROXY_URL}?url=${encodeURIComponent(full)}`);
      }
    }

    if (pages.length === 0) throw new Error("Páginas não encontradas.");
    return pages;
  },
};

export default NHentaiBRPlugin;
