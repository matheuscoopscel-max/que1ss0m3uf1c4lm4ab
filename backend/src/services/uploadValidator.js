// FILE: backend/src/services/uploadValidator.js
// Validação de uploads por magic bytes (file signature).
// Previne bypass de tipo de arquivo via extensão ou MIME header falso.

/**
 * Mapa de assinaturas de bytes para tipos MIME permitidos.
 * Cada entrada: [offset, bytes em hex, mime]
 */
const SIGNATURES = [
  { offset: 0, hex: "ffd8ff",   mime: "image/jpeg"  },  // JPEG
  { offset: 0, hex: "89504e47", mime: "image/png"   },  // PNG
  { offset: 0, hex: "47494638", mime: "image/gif"   },  // GIF
  { offset: 0, hex: "52494646", mime: "image/webp",     // WEBP (RIFF....WEBP)
    validate: (buf) => buf.slice(8, 12).toString("ascii") === "WEBP" },
];

const ALLOWED_MIMES = new Set(SIGNATURES.map((s) => s.mime));

/**
 * Verifica os magic bytes de um buffer de arquivo.
 *
 * @param {Buffer} buffer
 * @returns {{ valid: boolean, detectedMime: string|null }}
 */
export function validateImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) {
    return { valid: false, detectedMime: null };
  }

  for (const sig of SIGNATURES) {
    const slice  = buffer.slice(sig.offset, sig.offset + sig.hex.length / 2);
    const hexStr = slice.toString("hex");

    if (hexStr.startsWith(sig.hex)) {
      // Validação adicional para formatos com header variável (WebP)
      if (sig.validate && !sig.validate(buffer)) continue;

      return { valid: true, detectedMime: sig.mime };
    }
  }

  return { valid: false, detectedMime: null };
}

/**
 * Valida tamanho e tipo de um arquivo de imagem.
 *
 * @param {Buffer} buffer
 * @param {{ maxSizeBytes?: number }} opts
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImageUpload(buffer, { maxSizeBytes = 5 * 1024 * 1024 } = {}) {
  if (buffer.length > maxSizeBytes) {
    return { valid: false, error: `Arquivo muito grande. Máximo: ${maxSizeBytes / 1024 / 1024}MB.` };
  }

  const { valid, detectedMime } = validateImageMagicBytes(buffer);

  if (!valid) {
    return { valid: false, error: "Formato de arquivo não suportado. Use JPEG, PNG, WebP ou GIF." };
  }

  return { valid: true, detectedMime };
}
