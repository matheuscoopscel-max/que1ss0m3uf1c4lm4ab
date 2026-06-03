// FILE: backend/src/routes/profiles.js
// Rotas de perfil:
//   GET  /api/profiles/:username        — perfil público
//   GET  /api/me/profile               — próprio perfil (autenticado)
//   PATCH /api/me/profile              — editar perfil
//   POST  /api/me/avatar               — upload de avatar
//   POST  /api/me/banner               — upload de banner
//   GET  /api/me/stats                 — estatísticas do usuário
//   GET  /api/me/activity              — atividade recente

import { Router } from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import {
  findProfileByUsername,
  findProfileByUserId,
  updateProfile,
  getUserStats,
  getRecentActivity,
  createProfile,
} from "../models/Profile.js";
import {
  upload,
  saveAvatar,
  saveBanner,
  removeUpload,
} from "../services/uploadService.js";

export const profilesRouter = Router();
export const meProfileRouter = Router();

// ── GET /api/profiles/:username ───────────────────────────────────────────────
profilesRouter.get("/:username", async (req, res, next) => {
  try {
    const profile = await findProfileByUsername(req.params.username);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Perfil não encontrado." });
    }

    const stats    = await getUserStats(profile.userId);
    const activity = profile.isPublic
      ? await getRecentActivity(profile.userId, 10)
      : [];

    res.json({ success: true, profile, stats, activity });
  } catch (err) {
    next(err);
  }
});

// ── Rotas /api/me/profile* (autenticadas) ─────────────────────────────────────
meProfileRouter.use(authenticate);

// GET /api/me/profile
meProfileRouter.get("/", async (req, res, next) => {
  try {
    let profile = await findProfileByUserId(req.user.id);
    // Cria perfil se não existir (migração de usuários antigos)
    if (!profile) {
      await createProfile(req.user.id);
      profile = await findProfileByUserId(req.user.id);
    }
    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/me/profile
meProfileRouter.patch(
  "/",
  [
    body("displayName").optional().isLength({ max: 100 }),
    body("bio").optional().isLength({ max: 500 }),
    body("websiteUrl").optional().isURL().withMessage("URL inválida."),
    body("isPublic").optional().isBoolean().toBoolean(),
  ],
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });

    try {
      const profile = await updateProfile(req.user.id, req.body);
      res.json({ success: true, profile });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/me/avatar
meProfileRouter.post("/avatar", upload.single("avatar"), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Nenhum arquivo enviado." });
  }
  try {
    // Remove avatar anterior
    const current = await findProfileByUserId(req.user.id);
    if (current?.avatarUrl) await removeUpload(current.avatarUrl);

    const avatarUrl = await saveAvatar(req.file.buffer, req.user.id);
    const profile   = await updateProfile(req.user.id, { avatarUrl });
    res.json({ success: true, avatarUrl, profile });
  } catch (err) {
    next(err);
  }
});

// POST /api/me/banner
meProfileRouter.post("/banner", upload.single("banner"), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Nenhum arquivo enviado." });
  }
  try {
    const current = await findProfileByUserId(req.user.id);
    if (current?.bannerUrl) await removeUpload(current.bannerUrl);

    const bannerUrl = await saveBanner(req.file.buffer, req.user.id);
    const profile   = await updateProfile(req.user.id, { bannerUrl });
    res.json({ success: true, bannerUrl, profile });
  } catch (err) {
    next(err);
  }
});

// GET /api/me/stats
meProfileRouter.get("/stats", async (req, res, next) => {
  try {
    const stats = await getUserStats(req.user.id);
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
});

// GET /api/me/activity
meProfileRouter.get("/activity", async (req, res, next) => {
  try {
    const activity = await getRecentActivity(req.user.id, 20);
    res.json({ success: true, activity });
  } catch (err) {
    next(err);
  }
});
