import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/database/prisma";
import { SESSION_COOKIE, verifySessionToken } from "./session";
import type { User } from "@prisma/client";

// Verificação completa (assinatura + usuário ainda ativo no banco).
// Middleware faz só a checagem rápida de assinatura; isto é a fonte de
// verdade real, usada em layouts/route handlers de /dashboard e /admin.
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.active) return null;

  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}
