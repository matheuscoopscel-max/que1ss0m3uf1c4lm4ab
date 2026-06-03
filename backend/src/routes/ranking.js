// FILE: backend/src/routes/ranking.js — Patch #27 final
// Montado em app.use("/api", rankingRouter) no server.js
// Todas as rotas usam paths completos relativos a /api

import { Router } from "express";
import { authenticate, authenticateOptional } from "../middleware/authenticate.js";
import {
  getUserXP, listAchievements,
  getGlobalRanking, getUserRank,
  checkAndUnlockAchievements,
} from "../models/Ranking.js";

export const rankingRouter = Router();

// GET /api/ranking/list
rankingRouter.get("/ranking/list", async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit  ?? "50"), 100);
    const offset = parseInt(req.query.offset ?? "0");
    const rows   = await getGlobalRanking({ limit, offset });
    res.json({ success: true, ranking: rows });
  } catch (err) { next(err); }
});

// GET /api/me/xp
rankingRouter.get("/me/xp", authenticate, async (req, res, next) => {
  try {
    const [xp, rank] = await Promise.all([
      getUserXP(req.user.id),
      getUserRank(req.user.id),
    ]);
    res.json({ success: true, ...xp, rank });
  } catch (err) { next(err); }
});

// GET /api/me/achievements
rankingRouter.get("/me/achievements", authenticate, async (req, res, next) => {
  try {
    const achievements = await listAchievements(req.user.id);
    res.json({ success: true, achievements });
  } catch (err) { next(err); }
});

// GET /api/achievements/catalog — catálogo público
rankingRouter.get("/achievements/catalog", authenticateOptional, async (req, res, next) => {
  try {
    const achievements = await listAchievements(req.user?.id ?? null);
    res.json({ success: true, achievements });
  } catch (err) { next(err); }
});

// POST /api/ranking/check
rankingRouter.post("/ranking/check", authenticate, async (req, res, next) => {
  try {
    const unlocked = await checkAndUnlockAchievements(req.user.id);
    res.json({ success: true, unlocked });
  } catch (err) { next(err); }
});
