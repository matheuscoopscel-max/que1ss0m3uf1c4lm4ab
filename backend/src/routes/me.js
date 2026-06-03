// FILE: backend/src/routes/me.js
// Rotas do usuário autenticado:
//   GET  /api/me              — dados do usuário logado
//   GET  /api/me/installations — plugins instalados na conta
//   POST /api/me/installations — adiciona/sincroniza uma instalação
//   DELETE /api/me/installations/:slug — remove uma instalação

import { Router } from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import {
  findUserById,
  getUserInstallations,
  upsertInstallation,
  removeInstallation,
} from "../models/User.js";

export const meRouter = Router();

// Todas as rotas /api/me requerem autenticação
meRouter.use(authenticate);

// ── GET /api/me ───────────────────────────────────────────────────────────────
meRouter.get("/", async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "Usuário não encontrado." });

    res.json({
      success: true,
      user: {
        id:         user.id,
        email:      user.email,
        username:   user.username,
        isVerified: user.is_verified,
        createdAt:  user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/me/installations ─────────────────────────────────────────────────
meRouter.get("/installations", async (req, res, next) => {
  try {
    const rows = await getUserInstallations(req.user.id);
    res.json({
      success:       true,
      installations: rows.map((r) => ({
        slug:          r.plugin_slug,
        repositoryUrl: r.repository_url,
        name:          r.plugin_name,
        version:       r.plugin_version,
        installedAt:   r.installed_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/me/installations ────────────────────────────────────────────────
// Chamado ao instalar um plugin quando o usuário está autenticado.
meRouter.post(
  "/installations",
  [
    body("slug").notEmpty().withMessage("slug obrigatório."),
    body("repositoryUrl").notEmpty().withMessage("repositoryUrl obrigatório."),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { slug, repositoryUrl, name, version } = req.body;
      const row = await upsertInstallation({
        userId:        req.user.id,
        pluginSlug:    slug,
        repositoryUrl,
        pluginName:    name,
        pluginVersion: version,
      });
      res.status(201).json({ success: true, installation: row });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/me/installations/sync ──────────────────────────────────────────
// Sincroniza um array inteiro de plugins (usado no login para merge local ↔ servidor).
meRouter.post("/installations/sync", async (req, res, next) => {
  const { plugins } = req.body;
  if (!Array.isArray(plugins)) {
    return res.status(400).json({ success: false, message: "plugins deve ser um array." });
  }

  try {
    const results = await Promise.allSettled(
      plugins.map((p) =>
        upsertInstallation({
          userId:        req.user.id,
          pluginSlug:    p.slug,
          repositoryUrl: p.repositoryUrl ?? "",
          pluginName:    p.name,
          pluginVersion: p.version,
        })
      )
    );

    const synced = results.filter((r) => r.status === "fulfilled").length;
    res.json({ success: true, synced });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/me/installations/:slug ────────────────────────────────────────
meRouter.delete("/installations/:slug", async (req, res, next) => {
  try {
    await removeInstallation(req.user.id, req.params.slug);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
