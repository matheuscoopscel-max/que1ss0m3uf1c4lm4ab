// FILE: backend/src/middleware/authenticate.js
// Middleware de autenticação JWT para rotas protegidas.
// Lê o Bearer token do header Authorization e injeta req.user.

import { verifyAccessToken } from "../services/authService.js";

/**
 * Middleware obrigatório: rejeita requisições sem token válido.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Token de acesso obrigatório." });
  }

  const token   = header.slice(7);
  const payload = verifyAccessToken(token);

  if (!payload) {
    return res.status(401).json({ success: false, message: "Token inválido ou expirado." });
  }

  req.user = { id: payload.sub, email: payload.email, username: payload.username };
  next();
}

/**
 * Middleware opcional: injeta req.user se token válido, mas não bloqueia sem token.
 * Útil para rotas que funcionam tanto autenticadas quanto anônimas.
 */
export function authenticateOptional(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const payload = verifyAccessToken(header.slice(7));
    if (payload) {
      req.user = { id: payload.sub, email: payload.email, username: payload.username };
    }
  }
  next();
}
