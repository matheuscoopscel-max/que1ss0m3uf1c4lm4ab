// FILE: frontend/public/plugins/streamhub-hls.js
// OmniMedia — Plugin de Desenvolvimento: StreamHub HLS
//
// Plugin MOCK para testar o player de vídeo (Patch #5).
// Retorna streams HLS públicos e de domínio público para teste.

const MOCK_STREAMS = [
  {
    id: "big-buck-bunny",
    title: "Big Buck Bunny",
    coverUrl: "https://picsum.photos/seed/bbb/300/420",
    description: "Curta de animação 3D open-source da Blender Foundation. Um coelho gigante enfrenta criaturas malvadas.",
    mediaType: "video-stream",
    tags: ["animação", "open-source", "comédia"],
    lastUpdated: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "elephant-dream",
    title: "Elephant Dream",
    coverUrl: "https://picsum.photos/seed/elephantdream/300/420",
    description: "O primeiro filme open-source do mundo, produzido com Blender. Uma viagem surreal e poética.",
    mediaType: "video-stream",
    tags: ["animação", "open-source", "arte"],
    lastUpdated: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "tears-of-steel",
    title: "Tears of Steel",
    coverUrl: "https://picsum.photos/seed/tos/300/420",
    description: "Curta sci-fi open-source da Blender Foundation com VFX e live action.",
    mediaType: "video-stream",
    tags: ["sci-fi", "open-source", "vfx"],
    lastUpdated: "2024-01-01T00:00:00.000Z",
  },
];

// Streams HLS públicos reais para teste (domínio público/Creative Commons)
const STREAM_URLS = {
  "big-buck-bunny": {
    type: "hls",
    url: "https://test-streams.mux.dev/x36xhzz/url_6/193039199_mp4_h264_aac_hq_7.m3u8",
  },
  "elephant-dream": {
    type: "mp4",
    url: "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
  },
  "tears-of-steel": {
    type: "hls",
    url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
  },
};

const StreamHubPlugin = {
  slug: "streamhub-hls",
  name: "StreamHub HLS",
  version: "2.1.3",
  mediaType: "video-stream",

  async search(query) {
    await new Promise((r) => setTimeout(r, 300));
    const q = query.toLowerCase().trim();
    if (!q) return MOCK_STREAMS;
    return MOCK_STREAMS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  },

  async getDetails(id) {
    await new Promise((r) => setTimeout(r, 200));
    const item = MOCK_STREAMS.find((s) => s.id === id);
    if (!item) throw new Error(`Stream "${id}" não encontrado no StreamHub.`);
    return { ...item, authors: ["Blender Foundation"] };
  },

  async getPagesOrStream(id, _episodeId) {
    await new Promise((r) => setTimeout(r, 200));
    const streamUrl = STREAM_URLS[id];
    if (!streamUrl) throw new Error(`URL de stream não encontrada para "${id}".`);
    return streamUrl;
  },
};

export default StreamHubPlugin;
