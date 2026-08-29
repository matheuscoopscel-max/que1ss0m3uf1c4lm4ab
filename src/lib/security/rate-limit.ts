import "server-only";

// Rate limit em memória — sem Redis/fila (A9.txt proíbe infra extra no
// MVP). Limitação conhecida e aceita: reseta a cada restart do processo
// e não é compartilhado entre instâncias — suficiente pra uma VPS única
// rodando um processo Node só.
const buckets = new Map<string, { count: number; resetAt: number }>();

// Limpeza ocasional pra não vazar memória com IPs que nunca mais voltam.
let lastCleanup = Date.now();
function cleanupIfNeeded() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): boolean {
  cleanupIfNeeded();

  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? "unknown";
}
