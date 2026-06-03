// FILE: backend/src/middleware/inputSanitizer.js
// Sanitização de inputs de texto contra XSS.
// Aplicado automaticamente em todos os campos string do body/query.

import xss from "xss";

// Configuração do XSS: não permite NENHUMA tag HTML em inputs de API
const XSS_OPTIONS = {
  whiteList:       {},          // sem tags permitidas
  stripIgnoreTag:  true,        // remove tags não permitidas
  stripIgnoreTagBody: ["script", "style", "iframe", "object", "embed"],
};

/**
 * Sanitiza recursivamente um valor contra XSS.
 * @param {unknown} value
 * @returns {unknown}
 */
function sanitizeValue(value) {
  if (typeof value === "string") return xss(value.trim(), XSS_OPTIONS);
  if (Array.isArray(value))      return value.map(sanitizeValue);
  if (value && typeof value === "object") return sanitizeObject(value);
  return value;
}

function sanitizeObject(obj) {
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    // Não sanitiza campos de senha (alteraria o hash)
    if (key === "password" || key === "confirm" || key === "currentPassword") {
      result[key] = val;
    } else {
      result[key] = sanitizeValue(val);
    }
  }
  return result;
}

/**
 * Middleware que sanitiza req.body e req.query contra XSS.
 * Aplicado globalmente antes de qualquer rota.
 */
export function sanitizeXss(req, res, next) {
  if (req.body   && typeof req.body   === "object") req.body   = sanitizeObject(req.body);
  if (req.query  && typeof req.query  === "object") req.query  = sanitizeObject(req.query);
  if (req.params && typeof req.params === "object") req.params = sanitizeObject(req.params);
  next();
}

/**
 * Valida que um campo de texto não contém padrões suspeitos
 * (SQL injection attempt, script injection, path traversal).
 * Retorna true se o input parece malicioso.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isMaliciousInput(value) {
  if (typeof value !== "string") return false;
  const patterns = [
    /<script[\s>]/i,                          // script injection
    /javascript:/i,                           // javascript: protocol
    /on\w+\s*=/i,                             // event handlers (onerror=, onclick=)
    /union\s+select/i,                        // SQL union select
    /drop\s+table/i,                          // SQL drop
    /insert\s+into.*values/i,                 // SQL insert
    /\.\.\//,                                 // path traversal
    /\x00/,                                   // null bytes
  ];
  return patterns.some((p) => p.test(value));
}
