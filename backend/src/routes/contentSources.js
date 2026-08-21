// FILE: backend/src/routes/contentSources.js
// Rotas públicas de leitura do catálogo curado pelo admin:
// GET /api/repositories    — repositórios ativos (o cliente busca o index.json direto)
// GET /api/plugins/active  — slugs de plugins ligados para todos os usuários
// Escrita/curadoria fica só em /api/admin/repositories e /api/admin/plugins.

import { Router } from "express";
import { listRepositories, listActivePluginSlugs } from "../models/ContentSources.js";

export const contentSourcesRouter = Router();

contentSourcesRouter.get("/repositories", async (_req, res, next) => {
  try {
    const rows = await listRepositories({ activeOnly: true });
    res.json({
      success: true,
      repositories: rows.map((r) => ({
        id:          r.id,
        url:         r.url,
        name:        r.name,
        description: r.description,
      })),
    });
  } catch (err) { next(err); }
});

contentSourcesRouter.get("/plugins/active", async (_req, res, next) => {
  try {
    const slugs = await listActivePluginSlugs();
    res.json({ success: true, slugs });
  } catch (err) { next(err); }
});
