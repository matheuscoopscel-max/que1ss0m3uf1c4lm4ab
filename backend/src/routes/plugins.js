// FILE: backend/src/routes/plugins.js
// Router de plugins: GET /api/plugins, GET /api/plugins/:slug,
// POST /api/plugins/submit, POST /api/plugins/:slug/install

import { Router } from "express";
import { body, query as vQuery, validationResult } from "express-validator";
import {
  listPlugins,
  findBySlug,
  createSubmission,
  incrementInstallCount,
} from "../models/Plugin.js";
import {
  validateSubmissionBody,
  checkScriptAccessibility,
  isSlugTaken,
} from "../services/pluginValidator.js";
import { submitLimiter } from "../middleware/rateLimiter.js";

export const pluginsRouter = Router();

// ─── GET /api/plugins ─────────────────────────────────────────────────────────
// Parâmetros de query:
//   includeRestricted=true|false  (default: false)
//   category=comics|ebooks|video|...
//   q=string                      busca textual
//   limit=50                      max 100
//   offset=0
pluginsRouter.get(
  "/",
  [
    vQuery("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    vQuery("offset").optional().isInt({ min: 0 }).toInt(),
    vQuery("includeRestricted").optional().isBoolean().toBoolean(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { plugins, total } = await listPlugins({
        includeRestricted: req.query.includeRestricted ?? false,
        category: req.query.category,
        q: req.query.q,
        limit: req.query.limit ?? 50,
        offset: req.query.offset ?? 0,
      });

      res.json({
        success: true,
        count: plugins.length,
        total,
        includesRestricted: req.query.includeRestricted ?? false,
        plugins,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/plugins/submit ─────────────────────────────────────────────────
// Submissão comunitária. Cria registro com status 'pending'.
pluginsRouter.post(
  "/submit",
  submitLimiter,
  async (req, res, next) => {
    try {
      // 1. Valida campos obrigatórios e formatos
      const { valid, errors } = validateSubmissionBody(req.body);
      if (!valid) {
        return res.status(400).json({ success: false, errors });
      }

      // 2. Slug único
      const taken = await isSlugTaken(req.body.slug);
      if (taken) {
        return res.status(409).json({
          success: false,
          message: `O slug "${req.body.slug}" já está em uso.`,
        });
      }

      // 3. Verifica acessibilidade da scriptUrl (não bloqueia se falhar — apenas avisa)
      const { accessible, reason } = await checkScriptAccessibility(req.body.scriptUrl);
      if (!accessible) {
        console.warn(`[submit] scriptUrl inacessível: ${reason}`);
      }

      // 4. Cria a submissão
      const plugin = await createSubmission({
        ...req.body,
        submitterIp: req.ip,
      });

      res.status(201).json({
        success: true,
        message: "Submissão recebida. Será revisada pela equipe de moderação.",
        plugin,
        scriptUrlWarning: !accessible ? reason : undefined,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/plugins/:slug ───────────────────────────────────────────────────
pluginsRouter.get("/:slug", async (req, res, next) => {
  try {
    const plugin = await findBySlug(req.params.slug);
    if (!plugin) {
      return res.status(404).json({ success: false, message: "Plugin não encontrado." });
    }
    res.json({ success: true, plugin });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/plugins/:slug/install ─────────────────────────────────────────
// Incrementa o contador de instalações (chamado pelo cliente ao instalar).
pluginsRouter.post("/:slug/install", async (req, res, next) => {
  try {
    const plugin = await findBySlug(req.params.slug);
    if (!plugin) {
      return res.status(404).json({ success: false, message: "Plugin não encontrado." });
    }
    await incrementInstallCount(req.params.slug);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
