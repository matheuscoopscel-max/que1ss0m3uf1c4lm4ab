// FILE: frontend/src/lib/store.js — Patch #31
// Repositórios e ativação de plugins agora são curados só pelo admin
// (GET /api/repositories, GET /api/plugins/active). Usuário comum não adiciona
// repositório nem instala plugin manualmente — installedPlugins é populado
// automaticamente a partir do catálogo aprovado (ver usePluginBootstrap).

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { unloadPlugin } from "./pluginLoader.js";
import { refreshRepository } from "./repositoryLoader.js";
import { getApiBaseUrl } from "./platform.js";

// ── Repositório padrão da comunidade (servido localmente em dev) ──────────────
// URL do repositório oficial — GitHub em produção, local em dev
const OFFICIAL_REPO_URL = import.meta.env.DEV
  ? "/community-repo/index.json"
  : "https://raw.githubusercontent.com/matheuscoopscel-max/que1ss0m3uf1c4lm4ab/main/frontend/public/community-repo/index.json";

const DEFAULT_REPOSITORIES = [
  {
    url: OFFICIAL_REPO_URL,
    name: "Repositório Oficial OmniMedia",
    description: "Plugins mantidos pela comunidade — MangaDex, Gutenberg, StreamHub.",
    author: "omnimedia-community",
    version: "1.1.0",
    website: "https://github.com/omnimedia-community/plugins",
    plugins: [],
    status: "idle",
    error: null,
    lastFetched: 0,
  },
];

export const useOmniStore = create(
  persist(
    (set, get) => ({

      // ── Aba ativa ─────────────────────────────────────────────────────────
      activeTab: "library",
      setActiveTab: (tab) =>
        set({ activeTab: tab, libraryView: "grid", selectedItem: null }),

      // ── Configurações ─────────────────────────────────────────────────────
      settings: {
        restrictedContentEnabled: false,
        readerMode: "cascade",
        tvMode: false,
        language: "pt-BR",
      },
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      // ── Usuário autenticado ───────────────────────────────────────────────
      user: null,   // { id, email, username } | null
      setUser: (user) => set({ user }),

      // ── Repositórios (curados pelo admin) ────────────────────────────────────
      // Cada repositório contém: url, name, plugins[], status, error, lastFetched
      repositories: DEFAULT_REPOSITORIES,

      /**
       * Busca a lista de repositórios aprovados pelo admin (GET /api/repositories).
       * Mantém DEFAULT_REPOSITORIES como fallback se a API falhar (ex: dev offline).
       */
      loadApprovedRepositories: async () => {
        try {
          const res = await fetch(`${getApiBaseUrl()}/repositories`);
          const data = await res.json();
          if (data?.success && Array.isArray(data.repositories) && data.repositories.length > 0) {
            set({
              repositories: data.repositories.map((r) => ({
                url: r.url, name: r.name ?? r.url, description: r.description ?? "",
                author: "", version: "", website: null,
                plugins: [], status: "idle", error: null, lastFetched: 0,
              })),
            });
          }
        } catch {
          // Mantém DEFAULT_REPOSITORIES — não bloqueia o boot do app.
        }
      },

      // ── Ativação de plugins (curada pelo admin) ──────────────────────────────
      activePluginSlugs: [],
      loadActivePluginSlugs: async () => {
        try {
          const res = await fetch(`${getApiBaseUrl()}/plugins/active`);
          const data = await res.json();
          if (data?.success) set({ activePluginSlugs: data.slugs ?? [] });
        } catch {
          // Sem lista do servidor — nenhum plugin é auto-ativado até reconectar.
        }
      },

      /**
       * Re-faz fetch de todos os repositórios.
       */
      refreshAllRepositories: async () => {
        const { repositories } = get();

        // Marca todos como loading
        set((s) => ({
          repositories: s.repositories.map((r) => ({ ...r, status: "loading" })),
        }));

        const refreshed = await Promise.allSettled(
          repositories.map((r) => refreshRepository(r))
        );

        set((s) => ({
          repositories: s.repositories.map((r, i) => {
            const result = refreshed[i];
            return result.status === "fulfilled"
              ? result.value
              : { ...r, status: "error", error: "Falha ao atualizar." };
          }),
        }));
      },

      /**
       * Retorna todos os plugins de todos os repositórios (filtrados por conteúdo restrito).
       * @returns {import('./repositoryLoader').RepositoryPlugin[]}
       */
      getAllRepositoryPlugins: () => {
        const { repositories, settings } = get();
        return repositories
          .filter((r) => r.status === "success")
          .flatMap((r) => r.plugins)
          .filter((p) =>
            settings.restrictedContentEnabled
              ? true
              : p.contentRating !== "restricted"
          );
      },

      // ── Filtros da aba de extensões ───────────────────────────────────────
      catalogSearch: "",
      setCatalogSearch: (q) => set({ catalogSearch: q }),
      catalogCategoryFilter: "all",
      setCatalogCategoryFilter: (cat) => set({ catalogCategoryFilter: cat }),
      activeRepositoryFilter: "all", // "all" | url do repositório específico
      setActiveRepositoryFilter: (url) => set({ activeRepositoryFilter: url }),

      // ── Plugins instalados ─────────────────────────────────────────────────
      installedPlugins: [],
      installPlugin: (plugin) => {
        const { installedPlugins } = get();
        if (installedPlugins.find((p) => p.slug === plugin.slug)) return;
        set({ installedPlugins: [...installedPlugins, plugin] });
      },
      uninstallPlugin: (slug) => {
        unloadPlugin(slug);
        set((s) => ({
          installedPlugins: s.installedPlugins.filter((p) => p.slug !== slug),
          pluginLoadStatus: Object.fromEntries(
            Object.entries(s.pluginLoadStatus ?? {}).filter(([k]) => k !== slug)
          ),
        }));
      },
      isInstalled: (slug) =>
        get().installedPlugins.some((p) => p.slug === slug),

      // ── Status de carga individual ─────────────────────────────────────────
      pluginLoadStatus: {},
      setPluginLoadStatus: (slug, status) =>
        set((s) => ({
          pluginLoadStatus: { ...s.pluginLoadStatus, [slug]: status },
        })),

      // ── Biblioteca local (tracking sem conta) ────────────────────────────────
      // Map: "pluginSlug::itemId" → { status, isFavorite, currentChapterNum, ... }
      localLibrary: {},
      setLocalLibraryItem: (key, data) =>
        set((s) => ({ localLibrary: { ...s.localLibrary, [key]: { ...s.localLibrary[key], ...data } } })),
      removeLocalLibraryItem: (key) =>
        set((s) => {
          const { [key]: _, ...rest } = s.localLibrary;
          return { localLibrary: rest };
        }),

      // ── Navegação da biblioteca ────────────────────────────────────────────
      libraryView: "grid",
      selectedItem: null,
      selectedChapter: null,
      openDetail: (item) =>
        set({ libraryView: "detail", selectedItem: item, selectedChapter: null }),
      openChapter: (chapter) =>
        set((s) => {
          const view =
            s.selectedItem?.mediaType === "video-stream" ? "player" : "reader";

          // Auto-adiciona à biblioteca como "Lendo" (ou "Assistindo") ao abrir capítulo
          if (s.selectedItem) {
            const item = s.selectedItem;
            const status = item.mediaType === "video-stream" ? "watching" : "reading";
            // Chama a API em background sem bloquear a navegação
            fetch("/api/me/library", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                pluginSlug:    item.pluginSlug,
                itemId:        item.id,
                itemTitle:     item.title,
                itemCoverUrl:  item.coverUrl,
                itemMediaType: item.mediaType,
                repositoryUrl: item.repositoryUrl ?? "",
                status,
              }),
            }).catch(() => {}); // silencioso — não interrompe a leitura
          }

          return { libraryView: view, selectedChapter: chapter };
        }),
      backToGrid: () =>
        set({ libraryView: "grid", selectedItem: null, selectedChapter: null }),
      backToDetail: () =>
        set({ libraryView: "detail", selectedChapter: null }),
    }),
    {
      name: "omnimedia-storage-v2",  // nova chave para limpar cache do v1
      partialize: (state) => ({
        settings:         state.settings,
        installedPlugins: state.installedPlugins,
        // Persiste as URLs dos repositórios mas não os plugins em cache
        // (sempre refaz fetch ao abrir o app)
        user: state.user,
        localLibrary: state.localLibrary,
        repositories: state.repositories.map((r) => ({
          url:         r.url,
          name:        r.name,
          description: r.description,
          author:      r.author,
          version:     r.version,
          website:     r.website,
          plugins:     [],        // limpa plugins — serão re-fetched
          status:      "idle",
          error:       null,
          lastFetched: r.lastFetched,
        })),
      }),
    }
  )
);
