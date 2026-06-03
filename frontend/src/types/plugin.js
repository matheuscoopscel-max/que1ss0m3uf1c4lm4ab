// FILE: frontend/src/types/plugin.js
// OmniMedia — Definições de tipos (JSDoc) para o contrato de plugins.
// Estes tipos documentam a interface que todo plugin deve implementar.

/**
 * @typedef {Object} CatalogItem
 * @property {string} id               - Identificador único no escopo do plugin
 * @property {string} title            - Título da obra
 * @property {string} [coverUrl]       - URL da imagem de capa
 * @property {string} [description]    - Sinopse ou descrição curta
 * @property {'image-series'|'ebook'|'video-stream'} mediaType
 * @property {string[]} [tags]         - Tags de gênero/categoria
 * @property {string} [lastUpdated]    - ISO date string da última atualização
 * @property {string} pluginSlug       - Slug do plugin que gerou este item (injetado pelo loader)
 */

/**
 * @typedef {Object} Chapter
 * @property {string} id
 * @property {string} title
 * @property {number} [number]
 * @property {string} [releaseDate]
 */

/**
 * @typedef {Object} MediaDetails
 * @property {string} id
 * @property {string} title
 * @property {string} [coverUrl]
 * @property {string} [description]
 * @property {string[]} [authors]
 * @property {string[]} [tags]
 * @property {'image-series'|'ebook'|'video-stream'} mediaType
 * @property {Chapter[]} [chapters]    - Para image-series e ebooks
 * @property {string} [streamUrl]      - Para video-stream sem episódios
 */

/**
 * @typedef {Object} StreamUrl
 * @property {'hls'|'mp4'|'dash'} type
 * @property {string} url
 * @property {Object} [headers]        - Headers extras (ex: Referer)
 */

/**
 * Interface que todo plugin deve implementar.
 * O pluginLoader valida a presença e assinatura destas funções.
 *
 * @typedef {Object} PluginInstance
 * @property {string} slug
 * @property {string} name
 * @property {string} version
 * @property {'image-series'|'ebook'|'video-stream'} mediaType
 * @property {function(string): Promise<CatalogItem[]>} search
 * @property {function(string): Promise<MediaDetails>} getDetails
 * @property {function(string, string): Promise<string[]|StreamUrl>} getPagesOrStream
 */

// Exporta como namespace para uso com JSDoc em outros arquivos
export const PluginTypes = {};
