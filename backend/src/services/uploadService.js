// FILE: backend/src/services/uploadService.js
// Upload e redimensionamento de avatars e banners.
// Usa multer para receber o arquivo e sharp para redimensionar.
// Em produção, substitua o storage local por S3/R2/Cloudflare Images.

import multer from "multer";
import sharp  from "sharp";
import path   from "path";
import fs     from "fs/promises";
import { fileURLToPath } from "url";

const __dir       = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dir, "../../uploads");

export const AVATAR_DIR = path.join(UPLOADS_DIR, "avatars");
export const BANNER_DIR = path.join(UPLOADS_DIR, "banners");

// Garante que os diretórios existem
await fs.mkdir(AVATAR_DIR, { recursive: true });
await fs.mkdir(BANNER_DIR, { recursive: true });

// ── Multer: memória (processamos com sharp antes de salvar) ───────────────────
export const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Formato não suportado. Use JPEG, PNG, WebP ou GIF."));
  },
});

/**
 * Redimensiona e salva um avatar (256×256 WebP).
 * @param {Buffer} buffer
 * @param {string} userId
 * @returns {Promise<string>} URL pública do avatar
 */
export async function saveAvatar(buffer, userId) {
  const { valid, error } = validateImageUpload(buffer, { maxSizeBytes: 5 * 1024 * 1024 });
  if (!valid) throw Object.assign(new Error(error), { status: 400 });

  const filename = `${userId}-${Date.now()}.webp`;
  const filepath = path.join(AVATAR_DIR, filename);

  await sharp(buffer)
    .resize(256, 256, { fit: "cover", position: "center" })
    .webp({ quality: 85 })
    .toFile(filepath);

  return `/uploads/avatars/${filename}`;
}

/**
 * Redimensiona e salva um banner (1200×300 WebP).
 * @param {Buffer} buffer
 * @param {string} userId
 * @returns {Promise<string>} URL pública do banner
 */
export async function saveBanner(buffer, userId) {
  const { valid, error } = validateImageUpload(buffer, { maxSizeBytes: 5 * 1024 * 1024 });
  if (!valid) throw Object.assign(new Error(error), { status: 400 });

  const filename = `${userId}-banner-${Date.now()}.webp`;
  const filepath = path.join(BANNER_DIR, filename);

  await sharp(buffer)
    .resize(1200, 300, { fit: "cover", position: "center" })
    .webp({ quality: 80 })
    .toFile(filepath);

  return `/uploads/banners/${filename}`;
}

/**
 * Remove um arquivo de upload anterior (avatar ou banner).
 * @param {string|null} url — URL pública como /uploads/avatars/xxx.webp
 */
export async function removeUpload(url) {
  if (!url || !url.startsWith("/uploads/")) return;
  const filepath = path.join(UPLOADS_DIR, url.replace("/uploads/", ""));
  try {
    await fs.unlink(filepath);
  } catch {
    // Ignora silenciosamente se o arquivo não existir
  }
}
