// OmniMedia Plugin — Project Gutenberg Reader
// Acessa o catálogo público do Project Gutenberg via gutendex.com
// Todas as obras são de domínio público.
//
// API: https://gutendex.com (wrapper REST não-oficial para Gutenberg)

const API_BASE  = "https://gutendex.com";
const COVER_CDN = "https://www.gutenberg.org/cache/epub";

function toItem(book) {
  const title   = book.title ?? "Sem título";
  const authors = (book.authors ?? []).map((a) => a.name).join(", ");
  const cover   = book.formats?.["image/jpeg"] ?? `${COVER_CDN}/${book.id}/pg${book.id}.cover.medium.jpg`;
  const subjects = (book.subjects ?? []).slice(0, 5);

  return {
    id:          String(book.id),
    title,
    coverUrl:    cover,
    description: `${authors ? `por ${authors}. ` : ""}${subjects.join(" · ")}`,
    mediaType:   "ebook",
    tags:        subjects.map((s) => s.split(" -- ")[0].trim().toLowerCase()),
    lastUpdated: null,
    authors:     book.authors ?? [],
    pluginSlug:  "gutenberg-reader",
  };
}

const GutenbergPlugin = {
  slug:      "gutenberg-reader",
  name:      "Project Gutenberg",
  version:   "1.0.0",
  mediaType: "ebook",

  /**
   * Busca livros no catálogo do Gutenberg.
   * Sem query: retorna os mais populares (top downloads).
   */
  async search(query) {
    let url;
    if (!query || query.trim().length < 2) {
      url = `${API_BASE}/books?sort=popular&languages=pt,en&mime_type=text%2Fhtml`;
    } else {
      url = `${API_BASE}/books?search=${encodeURIComponent(query.trim())}&languages=pt,en`;
    }

    const res  = await fetch(url);
    const data = await res.json();
    return (data.results ?? []).slice(0, 20).map(toItem);
  },

  /**
   * Retorna os detalhes de um livro.
   * Monta os "capítulos" como uma lista de formatos disponíveis para leitura.
   */
  async getDetails(id) {
    const res  = await fetch(`${API_BASE}/books/${id}`);
    const book = await res.json();
    const item = toItem(book);

    // Formatos disponíveis como "capítulos" (na prática, o livro inteiro em diferentes formatos)
    const formats = book.formats ?? {};
    const chapters = [];

    if (formats["text/html"])     chapters.push({ id: "html",  title: "Ler online (HTML)",   number: 1, url: formats["text/html"]    });
    if (formats["application/epub+zip"]) chapters.push({ id: "epub",  title: "Download EPUB",  number: 2, url: formats["application/epub+zip"] });
    if (formats["text/plain; charset=utf-8"]) chapters.push({ id: "txt", title: "Texto simples (UTF-8)", number: 3, url: formats["text/plain; charset=utf-8"] });

    if (chapters.length === 0) {
      // Fallback: link direto para a página do Gutenberg
      chapters.push({ id: "web", title: "Ver no Project Gutenberg", number: 1, url: `https://www.gutenberg.org/ebooks/${id}` });
    }

    return {
      ...item,
      authors:  item.authors.map((a) => a.name),
      chapters,
    };
  },

  /**
   * Para e-books, retorna a URL do conteúdo para o leitor abrir.
   * O OmniMedia abrirá o HTML em um iframe ou redirecionará para download.
   */
  async getPagesOrStream(bookId, chapterId) {
    const res  = await fetch(`${API_BASE}/books/${bookId}`);
    const book = await res.json();
    const formats = book.formats ?? {};

    // Mapa de chapterId → URL
    const urlMap = {
      html:  formats["text/html"],
      epub:  formats["application/epub+zip"],
      txt:   formats["text/plain; charset=utf-8"],
      web:   `https://www.gutenberg.org/ebooks/${bookId}`,
    };

    const url = urlMap[chapterId];
    if (!url) throw new Error("Formato não disponível.");

    // Para ebooks retornamos a URL como array de um item
    // O player/reader do OmniMedia abre a URL diretamente
    return [url];
  },
};

export default GutenbergPlugin;
