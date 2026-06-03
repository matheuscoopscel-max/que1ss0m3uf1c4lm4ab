// FILE: frontend/public/plugins/webreader-universal.js
// OmniMedia — Plugin de Desenvolvimento: WebReader Universal
//
// Este é um plugin MOCK para fins de teste do sistema de plugins.
// Implementa 100% do contrato PluginInstance com dados fictícios.
// Em produção, plugins reais fariam fetch de fontes externas.
//
// Contrato implementado:
//   search(query)                         → Promise<CatalogItem[]>
//   getDetails(id)                        → Promise<MediaDetails>
//   getPagesOrStream(id, chapterId)       → Promise<string[]>

const MOCK_CATALOG = [
  {
    id: "one-punch-man",
    title: "One-Punch Man",
    coverUrl: "https://picsum.photos/seed/opm/300/420",
    description: "Um herói que derrota qualquer inimigo com um único soco. Mas será que a vida de herói tem algum sentido assim?",
    mediaType: "image-series",
    tags: ["ação", "comédia", "super-herói"],
    lastUpdated: "2024-09-01T00:00:00.000Z",
  },
  {
    id: "berserk",
    title: "Berserk",
    coverUrl: "https://picsum.photos/seed/berserk/300/420",
    description: "Guts, um mercenário solitário de espada enorme, luta contra demônios e o destino num mundo sombrio de fantasia.",
    mediaType: "image-series",
    tags: ["dark fantasy", "ação", "drama"],
    lastUpdated: "2024-08-15T00:00:00.000Z",
  },
  {
    id: "vagabond",
    title: "Vagabond",
    coverUrl: "https://picsum.photos/seed/vagabond/300/420",
    description: "A jornada de Miyamoto Musashi rumo à iluminação pelo caminho da espada no Japão feudal.",
    mediaType: "image-series",
    tags: ["histórico", "samurai", "filosófico"],
    lastUpdated: "2024-07-20T00:00:00.000Z",
  },
  {
    id: "attack-on-titan",
    title: "Attack on Titan",
    coverUrl: "https://picsum.photos/seed/aot/300/420",
    description: "Humanidade sobrevive dentro de muros gigantescos para se proteger de criaturas devoradoras de homens.",
    mediaType: "image-series",
    tags: ["ação", "drama", "distopia"],
    lastUpdated: "2024-09-10T00:00:00.000Z",
  },
  {
    id: "vinland-saga",
    title: "Vinland Saga",
    coverUrl: "https://picsum.photos/seed/vinland/300/420",
    description: "Thorfinn busca vingança pelo assassinato do pai numa épica saga vikings.",
    mediaType: "image-series",
    tags: ["histórico", "vikings", "aventura"],
    lastUpdated: "2024-08-30T00:00:00.000Z",
  },
];

// Gera capítulos fictícios para qualquer obra
function generateChapters(count = 12) {
  return Array.from({ length: count }, (_, i) => ({
    id: `chapter-${i + 1}`,
    title: `Capítulo ${i + 1}`,
    number: i + 1,
    releaseDate: new Date(Date.now() - (count - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

// Gera URLs de páginas fictícias (usa picsum.photos como placeholder de imagens)
function generatePages(mangaId, chapterId, pageCount = 18) {
  const seed = `${mangaId}-${chapterId}`;
  return Array.from({ length: pageCount }, (_, i) =>
    `https://picsum.photos/seed/${seed}-p${i + 1}/800/1200`
  );
}

const WebReaderPlugin = {
  slug: "webreader-universal",
  name: "WebReader Universal",
  version: "1.2.0",
  mediaType: "image-series",

  /**
   * Busca obras pelo título/tag.
   * @param {string} query
   * @returns {Promise<CatalogItem[]>}
   */
  async search(query) {
    // Simula latência de rede
    await new Promise((r) => setTimeout(r, 400));

    const q = query.toLowerCase().trim();
    if (!q) return MOCK_CATALOG;

    return MOCK_CATALOG.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q)) ||
      item.description.toLowerCase().includes(q)
    );
  },

  /**
   * Retorna os detalhes completos de uma obra, incluindo lista de capítulos.
   * @param {string} id
   * @returns {Promise<MediaDetails>}
   */
  async getDetails(id) {
    await new Promise((r) => setTimeout(r, 300));

    const item = MOCK_CATALOG.find((m) => m.id === id);
    if (!item) throw new Error(`Obra "${id}" não encontrada no WebReader.`);

    return {
      ...item,
      authors: ["Autor Mock"],
      chapters: generateChapters(item.id === "berserk" ? 374 : 12),
    };
  },

  /**
   * Retorna as URLs das páginas de um capítulo específico.
   * @param {string} id        - ID da obra
   * @param {string} chapterId - ID do capítulo
   * @returns {Promise<string[]>}
   */
  async getPagesOrStream(id, chapterId) {
    await new Promise((r) => setTimeout(r, 500));

    const item = MOCK_CATALOG.find((m) => m.id === id);
    if (!item) throw new Error(`Obra "${id}" não encontrada.`);

    return generatePages(id, chapterId);
  },
};

export default WebReaderPlugin;
