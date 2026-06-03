// FILE: backend/src/routes/community.js
// Rotas da comunidade: posts, comentários, reações, grupos.

import { Router } from "express";
import { body, validationResult } from "express-validator";
import { authenticate, authenticateOptional } from "../middleware/authenticate.js";
import {
  listPosts, createPost, toggleReaction,
  listComments, createComment,
  listGroups, createGroup, joinGroup, leaveGroup,
  getTrendingPosts,
} from "../models/Community.js";
import { getNotifications, getUnreadCount, markAllRead } from "../models/Notifications.js";
import { query } from "../db/pool.js";
import { earnXP, checkAndUnlockAchievements } from "../models/Ranking.js";
  listPosts, createPost, toggleReaction,
  listComments, createComment,
  listGroups, createGroup, joinGroup, leaveGroup,
} from "../models/Community.js";

export const communityRouter = Router();

// ── Posts ─────────────────────────────────────────────────────────────────────
communityRouter.get("/posts", authenticateOptional, async (req, res, next) => {
  try {
    const posts = await listPosts({
      groupId:     req.query.groupId,
      userId:      req.query.userId,
      requesterId: req.user?.id,
      limit:       parseInt(req.query.limit ?? "20"),
      offset:      parseInt(req.query.offset ?? "0"),
    });
    res.json({ success: true, posts });
  } catch (err) { next(err); }
});

communityRouter.post(
  "/posts",
  authenticate,
  [body("content").notEmpty().isLength({ max: 2000 })],
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });
    try {
      const post = await createPost({ userId: req.user.id, ...req.body });
      earnXP(req.user.id, 15, "post_created").catch(() => {});
    checkAndUnlockAchievements(req.user.id).catch(() => {});
    res.status(201).json({ success: true, post });
    } catch (err) { next(err); }
  }
);

communityRouter.post("/posts/:id/react", authenticate, async (req, res, next) => {
  try {
    const reaction = await toggleReaction(req.params.id, req.user.id, req.body.reaction);
    res.json({ success: true, reaction });
  } catch (err) { next(err); }
});

// ── Comments ──────────────────────────────────────────────────────────────────
communityRouter.get("/posts/:id/comments", async (req, res, next) => {
  try {
    const comments = await listComments(req.params.id);
    res.json({ success: true, comments });
  } catch (err) { next(err); }
});

communityRouter.post(
  "/posts/:id/comments",
  authenticate,
  [body("content").notEmpty().isLength({ max: 1000 })],
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });
    try {
      const comment = await createComment({
        postId: req.params.id,
        userId: req.user.id,
        parentId: req.body.parentId,
        content: req.body.content,
      });
      earnXP(req.user.id, 5, "comment_created").catch(() => {});
    checkAndUnlockAchievements(req.user.id).catch(() => {});
    res.status(201).json({ success: true, comment });
    } catch (err) { next(err); }
  }
);

// ── Groups ────────────────────────────────────────────────────────────────────
communityRouter.get("/groups", authenticateOptional, async (req, res, next) => {
  try {
    const groups = await listGroups({
      genre: req.query.genre,
      requesterId: req.user?.id,
      limit: parseInt(req.query.limit ?? "20"),
      offset: parseInt(req.query.offset ?? "0"),
    });
    res.json({ success: true, groups });
  } catch (err) { next(err); }
});

communityRouter.post(
  "/groups",
  authenticate,
  [
    body("name").notEmpty().isLength({ max: 200 }),
    body("slug").notEmpty().matches(/^[a-z0-9-]+$/),
  ],
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });
    try {
      const group = await createGroup({ ownerId: req.user.id, ...req.body });
      res.status(201).json({ success: true, group });
    } catch (err) { next(err); }
  }
);

communityRouter.post("/groups/:id/join",  authenticate, async (req, res, next) => {
  try { await joinGroup(req.params.id, req.user.id); res.json({ success: true }); }
  catch (err) { next(err); }
});

communityRouter.post("/groups/:id/leave", authenticate, async (req, res, next) => {
  try { await leaveGroup(req.params.id, req.user.id); res.json({ success: true }); }
  catch (err) { next(err); }
});

// ── Notificações ──────────────────────────────────────────────────────────────

communityRouter.get("/notifications", authenticate, async (req, res, next) => {
  try {
    const [notifs, count] = await Promise.all([
      getNotifications(req.user.id, { limit: 30 }),
      getUnreadCount(req.user.id),
    ]);
    res.json({ success: true, notifications: notifs, unreadCount: count });
  } catch (err) { next(err); }
});

communityRouter.get("/notifications/count", authenticate, async (req, res, next) => {
  try {
    const count = await getUnreadCount(req.user.id);
    res.json({ success: true, unreadCount: count });
  } catch (err) { next(err); }
});

communityRouter.post("/notifications/read-all", authenticate, async (req, res, next) => {
  try {
    await markAllRead(req.user.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Trending ──────────────────────────────────────────────────────────────────

communityRouter.get("/trending", async (req, res, next) => {
  try {
    const posts = await getTrendingPosts({ limit: 10 });
    res.json({ success: true, posts });
  } catch (err) { next(err); }
});
