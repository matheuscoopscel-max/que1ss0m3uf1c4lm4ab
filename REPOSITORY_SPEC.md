# OmniMedia Repository Specification v1.0

Um repositório OmniMedia é um arquivo `index.json` hospedado em qualquer URL pública
(GitHub raw, jsDelivr, seu próprio servidor, etc).

## Formato do index.json

```json
{
  "name": "Nome do Repositório",
  "description": "Descrição curta",
  "author": "seu-usuario",
  "version": "1.0.0",
  "website": "https://github.com/seu-usuario/omni-repo",
  "plugins": [
    {
      "slug": "meu-plugin",
      "name": "Meu Plugin",
      "version": "1.2.0",
      "description": "Descrição do que o plugin faz.",
      "author": "seu-usuario",
      "category": "comics",
      "contentRating": "general",
      "mediaTypes": ["image-series"],
      "scriptUrl": "https://raw.githubusercontent.com/seu-usuario/omni-repo/main/plugins/meu-plugin.js",
      "iconUrl": "https://raw.githubusercontent.com/seu-usuario/omni-repo/main/icons/meu-plugin.png",
      "tags": ["manga", "acao"],
      "language": "pt-BR"
    }
  ]
}
```

## Campos obrigatórios

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | string | Nome do repositório |
| `plugins` | array | Lista de plugins |
| `plugins[].slug` | string | Identificador único kebab-case |
| `plugins[].name` | string | Nome de exibição |
| `plugins[].version` | string | Versão semver |
| `plugins[].scriptUrl` | string | URL do arquivo .js do plugin |
| `plugins[].mediaTypes` | string[] | `image-series` \| `ebook` \| `video-stream` |

## Hospedar no GitHub (forma mais simples)

1. Crie um repositório público
2. Adicione o `index.json` na raiz
3. Adicione os arquivos `.js` dos plugins em `/plugins/`
4. A URL do repositório será:
   `https://raw.githubusercontent.com/seu-usuario/seu-repo/main/index.json`

## Exemplo de repositório oficial da comunidade

`https://raw.githubusercontent.com/omnimedia-community/plugins/main/index.json`
