// FILE: backend/src/routes/library.js
// Rotas da biblioteca pessoal (todas autenticadas):
//   GET    /api/me/library              — lista itens (filtro ?status=reading)
//   GET    /api/me/library/counts       — contagem por status
//   POST   /api/me/library              — adiciona/atualiza item
//   PATCH  /api/me/library/:slug/:itemId/progress  — atualiza progresso
//   PATCH  /api/me/library/:slug/:itemId/favorite  — toggle favorito
//   DELETE /api/me/library/:slug/:itemId           — remove item

import { Router } from "express";
import { earnXP, checkAndUnlockAchievements } from "../models/Ranking.js";
import { query as dbQuery } from "../db/pool.js";
import { body, query as vQuery, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import {
  listLibrary,
  findLibraryItem,
  upsertLibraryItem,
  updateProgress,
  toggleFavorite,
  removeLibraryItem,
  getStatusCounts,
  getLibraryItem,
} from "../models/Library.js";

export const libraryRouter = Router();
libraryRouter.use(authenticate);

const VALID_STATUSES = ["reading", "watching", "completed", "saved", "dropped", "all"];

// ── GET /api/me/library ───────────────────────────────────────────────────────
libraryRouter.get(
  "/",
  [
    vQuery("status").optional().isIn(VALID_STATUSES),
    vQuery("favorite").optional().isBoolean().toBoolean(),
    vQuery("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    vQuery("offset").optional().isInt({ min: 0 }).toInt(),
  ],
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });

    try {
      const items = await listLibrary(req.user.id, {
        status:     req.query.status,
        isFavorite: req.query.favorite,
        limit:      req.query.limit  ?? 50,
        offset:     req.query.offset ?? 0,
      });
      res.json({ success: true, items });
    } catch (err) { next(err); }
  }
);

// ── GET /api/me/library/counts ────────────────────────────────────────────────
libraryRouter.get("/counts", async (req, res, next) => {
  try {
    const counts = await getStatusCounts(req.user.id);
    res.json({ success: true, counts });
  } catch (err) { next(err); }
});

// ── GET /api/me/library/:slug/:itemId ─────────────────────────────────────────
libraryRouter.get("/:slug/:itemId", async (req, res, next) => {
  try {
    const item = await findLibraryItem(req.user.id, req.params.slug, req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item não encontrado." });
    res.json({ success: true, item });
  } catch (err) { next(err); }
});

// ── POST /api/me/library ──────────────────────────────────────────────────────
libraryRouter.post(
  "/",
  [
    body("pluginSlug").notEmpty(),
    body("itemId").notEmpty(),
    body("status").optional().isIn(["reading","watching","completed","saved","dropped"]),
  ],
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });

    try {
      const item = await upsertLibraryItem({ userId: req.user.id, ...req.body });
      res.status(201).json({ success: true, item });
    } catch (err) { next(err); }
  }
);

// ── PATCH /api/me/library/:slug/:itemId/progress ──────────────────────────────
libraryRouter.patch("/:slug/:itemId/progress", async (req, res, next) => {
  try {
    const prevItem = await getLibraryItem(req.user.id, req.params.slug, req.params.itemId).catch(() => null);
    const item = await updateProgress(req.user.id, req.params.slug, req.params.itemId, req.body);
    if (!item) return res.status(404).json({ success: false, message: "Item não encontrado." });

    // XP por capítulo lido
    if (req.body.lastChapterRead !== undefined) {
      const prevChapter = prevItem?.lastChapterRead ?? 0;
      const newChapter  = req.body.lastChapterRead ?? 0;
      if (newChapter > prevChapter) {
        await earnXP(req.user.id, 10, "chapter_read").catch(() => {});
        await dbQuery("SELECT earn_omnicoins($1, 1, 'chapter_read')", [req.user.id]).catch(() => {});
      }
    }

    // XP extra ao completar uma obra
    if (req.body.status === "completed" && prevItem?.status !== "completed") {
      await earnXP(req.user.id, 50, "title_completed").catch(() => {});
      await dbQuery("SELECT earn_omnicoins($1, 10, 'title_completed')", [req.user.id]).catch(() => {});
    }

    // Verifica conquistas desbloqueáveis (assíncrono, não bloqueia a resposta)
    checkAndUnlockAchievements(req.user.id).catch(() => {});

    res.json({ success: true, item });
  } catch (err) { next(err); }
});

// ── PATCH /api/me/library/:slug/:itemId/favorite ──────────────────────────────
libraryRouter.patch("/:slug/:itemId/favorite", async (req, res, next) => {
  try {
    const item = await toggleFavorite(req.user.id, req.params.slug, req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item não encontrado." });
    res.json({ success: true, item });
  } catch (err) { next(err); }
});

// ── DELETE /api/me/library/:slug/:itemId ──────────────────────────────────────
libraryRouter.delete("/:slug/:itemId", async (req, res, next) => {
  try {
    await removeLibraryItem(req.user.id, req.params.slug, req.params.itemId);
    res.json({ success: true });
  } catch (err) { next(err); }
});
