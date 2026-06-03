-- FILE: backend/migrations/002_seed_extensions.sql
-- Dados iniciais: converte o catálogo mock do Patch #1 para registros reais.
-- Executar via: npm run seed

INSERT INTO extensions (
  slug, name, version, author, description, category, content_rating,
  media_types, repository_url, script_url, status, homologated, install_count, tags
) VALUES
(
  'webreader-universal',
  'WebReader Universal',
  '1.2.0',
  'community',
  'Leitor de quadrinhos e mangás de domínio público e fontes abertas.',
  'comics',
  'general',
  ARRAY['image-series']::media_type[],
  'https://github.com/omnimedia-community/webreader-universal',
  '/plugins/webreader-universal.js',
  'approved',
  true,
  4821,
  ARRAY['comics', 'manga', 'webtoon', 'open-source']
),
(
  'bookshelf-reader',
  'Bookshelf Reader',
  '0.8.5',
  'community',
  'Suporte a e-books no formato EPUB e PDF do Project Gutenberg e Archive.org.',
  'ebooks',
  'general',
  ARRAY['ebook']::media_type[],
  'https://github.com/omnimedia-community/bookshelf-reader',
  '/plugins/bookshelf-reader.js',
  'approved',
  true,
  2103,
  ARRAY['ebook', 'epub', 'pdf', 'literature', 'gutenberg']
),
(
  'streamhub-hls',
  'StreamHub HLS',
  '2.1.3',
  'community',
  'Player HLS para streams públicos M3U8, canais abertos e VODs de domínio público.',
  'video',
  'general',
  ARRAY['video-stream']::media_type[],
  'https://github.com/omnimedia-community/streamhub-hls',
  '/plugins/streamhub-hls.js',
  'approved',
  true,
  7654,
  ARRAY['hls', 'm3u8', 'streaming', 'iptv', 'vod']
),
(
  'agegated-comics',
  'AgeGated Comics',
  '1.0.1',
  'community',
  'Plugin para conteúdo gráfico adulto (+18). Requer desativação do filtro de conteúdo sensível.',
  'comics',
  'restricted',
  ARRAY['image-series']::media_type[],
  'https://github.com/omnimedia-community/agegated-comics',
  '/plugins/agegated-comics.js',
  'approved',
  true,
  1230,
  ARRAY['adult', 'comics', 'restricted', '+18']
),
(
  'unfilteredstream',
  'UnfilteredStream',
  '1.3.0',
  'community',
  'Streams de vídeo adulto (+18) via HLS. Conteúdo restrito por padrão.',
  'video',
  'restricted',
  ARRAY['video-stream']::media_type[],
  'https://github.com/omnimedia-community/unfilteredstream',
  '/plugins/unfilteredstream.js',
  'approved',
  true,
  890,
  ARRAY['adult', 'stream', 'restricted', '+18', 'hls']
)
ON CONFLICT (slug) DO UPDATE SET
  version       = EXCLUDED.version,
  description   = EXCLUDED.description,
  install_count = EXCLUDED.install_count,
  updated_at    = NOW();
