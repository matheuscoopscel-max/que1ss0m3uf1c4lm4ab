// FILE: frontend/src/hooks/useLibraryStatus.js
// Gerencia o status de biblioteca de um item.
// Se autenticado: sincroniza com o servidor.
// Se não autenticado: salva apenas no Zustand store (localStorage).

import { useCallback } from "react";
import { useOmniStore } from "../lib/store";
import { triggerCoinsRefresh } from "../components/shop/OmniCoinsBalance";
import { triggerXPRefresh } from "./useXP";
import { api } from "../lib/api";

/**
 * Retorna os helpers de status para um item específico.
 * @param {{ pluginSlug: string, itemId: string, itemTitle?: string, itemCoverUrl?: string, itemMediaType?: string, repositoryUrl?: string }} item
 */
export function useLibraryStatus(item) {
  const user         = useOmniStore((s) => s.user);
  const localLibrary = useOmniStore((s) => s.localLibrary);
  const setLocalItem = useOmniStore((s) => s.setLocalLibraryItem);
  const removeLocalItem = useOmniStore((s) => s.removeLocalLibraryItem);

  const key = `${item.pluginSlug}::${item.itemId}`;
  const localItem = localLibrary[key] ?? null;

  // Status atual (server ou local)
  const status     = localItem?.status ?? null;
  const isFavorite = localItem?.isFavorite ?? false;
  const progress   = localItem?.currentChapterNum ?? null;
  const total      = localItem?.totalChapters ?? null;

  /**
   * Define ou atualiza o status do item.
   * @param {'reading'|'watching'|'completed'|'saved'|'dropped'|null} newStatus
   */
  const setStatus = useCallback(async (newStatus) => {
    const payload = {
      pluginSlug:    item.pluginSlug,
      itemId:        item.itemId,
      itemTitle:     item.itemTitle,
      itemCoverUrl:  item.itemCoverUrl,
      itemMediaType: item.itemMediaType,
      repositoryUrl: item.repositoryUrl,
      status:        newStatus,
      isFavorite,
    };

    // Atualiza local imediatamente (optimistic)
    setLocalItem(key, { ...payload, updatedAt: new Date().toISOString() });
    triggerCoinsRefresh();
    triggerXPRefresh(); // atualiza barra de XP

    // Sincroniza com servidor se autenticado
    if (user) {
      const res = await api.post("/me/library", payload);
      if (res.ok) {
        const data = await res.json();
        setLocalItem(key, data.item);
      }
    }
  }, [item, isFavorite, user, key, setLocalItem]);

  /**
   * Alterna favorito.
   */
  const toggleFavorite = useCallback(async () => {
    const newFav = !isFavorite;
    setLocalItem(key, { ...localItem, isFavorite: newFav });

    if (user) {
      await api.patch(`/me/library/${item.pluginSlug}/${item.itemId}/favorite`, {});
    }
  }, [item, isFavorite, localItem, user, key, setLocalItem]);

  /**
   * Salva o progresso de capítulo/episódio atual.
   */
  const saveProgress = useCallback(async ({ chapterId, chapterTitle, chapterNum, totalChapters }) => {
    setLocalItem(key, {
      ...localItem,
      currentChapterId:    chapterId,
      currentChapterTitle: chapterTitle,
      currentChapterNum:   chapterNum,
      totalChapters:       totalChapters ?? localItem?.totalChapters,
    });

    if (user) {
      await api.patch(`/me/library/${item.pluginSlug}/${item.itemId}/progress`, {
        chapterId, chapterTitle, chapterNum, totalChapters,
      });
    }
  }, [item, localItem, user, key, setLocalItem]);

  /**
   * Remove o item da biblioteca.
   */
  const removeFromLibrary = useCallback(async () => {
    removeLocalItem(key);
    if (user) {
      await api.delete(`/me/library/${item.pluginSlug}/${item.itemId}`);
    }
  }, [item, user, key, removeLocalItem]);

  return { status, isFavorite, progress, total, setStatus, toggleFavorite, saveProgress, removeFromLibrary };
}
