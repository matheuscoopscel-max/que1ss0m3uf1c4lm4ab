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

  if (name.length < 2 || name.length > 100) {
    return { ok: false, error: "Nome deve ter entre 2 e 100 caracteres." };
  }
  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    return { ok: false, error: "Email inválido." };
  }
  // bcrypt trunca silenciosamente em 72 bytes — acima disso a senha
  // "efetiva" seria mais curta do que o usuário digitou, sem avisar.
  if (password.length < 8 || password.length > 72) {
    return { ok: false, error: "Senha deve ter entre 8 e 72 caracteres." };
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
