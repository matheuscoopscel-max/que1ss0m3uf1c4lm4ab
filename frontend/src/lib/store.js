// FILE: frontend/src/lib/store.js — Patch #11
// Substituído: catálogo central (/api/plugins) → repositórios externos (index.json)
// O servidor OmniMedia não é mais consultado para listar plugins.
// Cada repositório é uma URL fornecida pelo usuário ou pré-configurada.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { unloadPlugin } from "./pluginLoader.js";
import { fetchRepository, refreshRepository } from "./repositoryLoader.js";
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

      // ── Repositórios ──────────────────────────────────────────────────────
      // Cada repositório contém: url, name, plugins[], status, error, lastFetched
      repositories: DEFAULT_REPOSITORIES,

      /**
       * Adiciona um novo repositório pela URL e faz fetch imediato.
       * @param {string} url
       * @returns {Promise<{success: boolean, error?: string}>}
       */
      addRepository: async (url) => {
        const { repositories } = get();
        const normalized = url.trim();

        if (!normalized) return { success: false, error: "URL não pode ser vazia." };

        if (repositories.find((r) => r.url === normalized)) {
          return { success: false, error: "Este repositório já foi adicionado." };
        }

        // Adiciona com status loading imediatamente
        const placeholder = {
          url: normalized, name: normalized, plugins: [],
          status: "loading", error: null, lastFetched: 0,
        };
        set((s) => ({ repositories: [...s.repositories, placeholder] }));

        const result = await fetchRepository(normalized);
        set((s) => ({
          repositories: s.repositories.map((r) =>
            r.url === normalized ? result : r
          ),
        }));

        return result.status === "success"
          ? { success: true }
          : { success: false, error: result.error };
      },

      /**
       * Remove um repositório pelo URL.
       * @param {string} url
       */
      removeRepository: (url) => {
        set((s) => ({
          repositories: s.repositories.filter((r) => r.url !== url),
        }));
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
       * Re-faz fetch de um repositório específico.
       * @param {string} url
       */
      refreshRepository: async (url) => {
        const { repositories } = get();
        const repo = repositories.find((r) => r.url === url);
        if (!repo) return;

        set((s) => ({
          repositories: s.repositories.map((r) =>
            r.url === url ? { ...r, status: "loading" } : r
          ),
        }));

        const result = await fetchRepository(url);
        set((s) => ({
          repositories: s.repositories.map((r) =>
            r.url === url ? result : r
          ),
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
