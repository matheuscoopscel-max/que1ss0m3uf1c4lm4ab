# OmniMedia — Especificação da Interface de Plugins

> Versão: 1.0 · Última atualização: Patch #9

Todo plugin OmniMedia é um módulo ES com um `export default` que implementa a interface `PluginInstance`.
O app carrega esse módulo dinamicamente e valida o contrato antes de registrá-lo.

---

## Interface obrigatória

```js
export default {
  // ── Metadados (obrigatórios) ──────────────────────────────────────────────
  slug:      "meu-plugin",          // string, único, kebab-case
  name:      "Meu Plugin",          // string, nome de exibição
  version:   "1.0.0",               // string, semver
  mediaType: "image-series",        // "image-series" | "ebook" | "video-stream"

  // ── Métodos (todos obrigatórios) ──────────────────────────────────────────
  async search(query)               { /* → Promise<CatalogItem[]>       */ },
  async getDetails(id)              { /* → Promise<MediaDetails>        */ },
  async getPagesOrStream(id, chId)  { /* → Promise<string[] | StreamUrl>*/ },
};
```

---

## Tipos de dados

### `CatalogItem`
```ts
{
  id:          string              // identificador único no escopo do plugin
  title:       string
  coverUrl?:   string              // URL da imagem de capa
  description?: string
  mediaType:   "image-series" | "ebook" | "video-stream"
  tags?:       string[]
  lastUpdated?: string             // ISO 8601
  // pluginSlug é injetado automaticamente pelo app — não inclua no retorno
}
```

### `MediaDetails`
```ts
{
  id:          string
  title:       string
  coverUrl?:   string
  description?: string
  authors?:    string[]
  tags?:       string[]
  mediaType:   "image-series" | "ebook" | "video-stream"
  chapters?:   Chapter[]          // para image-series e ebook
  streamUrl?:  string             // para video-stream sem episódios
}
```

### `Chapter`
```ts
{
  id:           string
  title:        string
  number?:      number
  releaseDate?: string            // ISO 8601
}
```

### `StreamUrl`
```ts
{
  type: "hls" | "mp4" | "dash"
  url:  string
  headers?: Record<string, string>  // ex: { "Referer": "https://fonte.com" }
}
```

---

## Comportamento esperado por método

### `search(query: string): Promise<CatalogItem[]>`

- `query === ""` → retorna o catálogo completo (até 50 itens)
- `query !== ""` → filtra por título, tags ou descrição
- Nunca lança exceção para query vazia
- Timeout recomendado: 10s

### `getDetails(id: string): Promise<MediaDetails>`

- Retorna detalhes completos incluindo lista de `chapters`
- Para `video-stream` sem episódios, omite `chapters` e inclui `streamUrl`
- Lança erro se o `id` não existir

### `getPagesOrStream(id: string, chapterId: string): Promise<string[] | StreamUrl>`

- Para `image-series` e `ebook`: retorna `string[]` com URLs das páginas/imagens em ordem
- Para `video-stream`: retorna `StreamUrl` com `type` e `url`
- Lança erro se o capítulo não existir

---

## Exemplo mínimo funcional

```js
// meu-plugin.js
const ITEMS = [
  { id: "obra-1", title: "Minha Obra", mediaType: "image-series", tags: ["ação"] },
];

export default {
  slug:      "meu-plugin",
  name:      "Meu Plugin",
  version:   "1.0.0",
  mediaType: "image-series",

  async search(query) {
    if (!query) return ITEMS;
    return ITEMS.filter(i => i.title.toLowerCase().includes(query.toLowerCase()));
  },

  async getDetails(id) {
    const item = ITEMS.find(i => i.id === id);
    if (!item) throw new Error(`"${id}" não encontrado.`);
    return {
      ...item,
      chapters: [
        { id: "cap-1", title: "Capítulo 1", number: 1 },
        { id: "cap-2", title: "Capítulo 2", number: 2 },
      ],
    };
  },

  async getPagesOrStream(id, chapterId) {
    // Retorna URLs de páginas (podem ser CDN externo, sem CORS obrigatório)
    return [
      `https://minha-fonte.com/pages/${id}/${chapterId}/1.jpg`,
      `https://minha-fonte.com/pages/${id}/${chapterId}/2.jpg`,
    ];
  },
};
```

---

## Regras de segurança e conduta

1. **Nunca armazene credenciais no código-fonte** do plugin. Use variáveis de configuração locais.
2. **Respeite os Termos de Serviço** das fontes que você acessa. O OmniMedia não é responsável pelo conteúdo.
3. **Conteúdo +18**: declare `contentRating: "restricted"` na submissão ao catálogo. Plugins que ocultam conteúdo adulto serão rejeitados e banidos.
4. **Não rastreie usuários**. Plugins não devem enviar dados para servidores de analytics de terceiros.
5. **Performance**: `search("")` deve responder em menos de 5s. Implemente cache local quando necessário.

---

## Submissão ao catálogo

```http
POST /api/plugins/submit
Content-Type: application/json

{
  "slug":         "meu-plugin",
  "name":         "Meu Plugin",
  "version":      "1.0.0",
  "author":       "seu-usuario",
  "description":  "Descrição clara do que o plugin faz.",
  "category":     "comics",
  "contentRating":"general",
  "mediaTypes":   ["image-series"],
  "repositoryUrl":"https://github.com/seu-usuario/meu-plugin",
  "scriptUrl":    "https://cdn.jsdelivr.net/gh/seu-usuario/meu-plugin@1.0.0/dist/plugin.js",
  "tags":         ["manga", "ação"]
}
```

Após a submissão, o plugin fica com `status: pending` até ser revisado pela equipe.
