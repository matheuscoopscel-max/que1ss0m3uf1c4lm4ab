const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateRegisterInput(input: {
  name?: unknown;
  email?: unknown;
  password?: unknown;
}): ValidationResult {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (name.length < 2) {
    return { ok: false, error: "Nome deve ter pelo menos 2 caracteres." };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, error: "Email inválido." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Senha deve ter pelo menos 8 caracteres." };
  }
  return { ok: true };
}

export function validateLoginInput(input: {
  email?: unknown;
  password?: unknown;
}): ValidationResult {
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!EMAIL_REGEX.test(email) || password.length === 0) {
    return { ok: false, error: "Credenciais inválidas." };
  }
  return { ok: true };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
