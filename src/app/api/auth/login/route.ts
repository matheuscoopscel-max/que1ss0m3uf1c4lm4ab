import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";
import { normalizeEmail, validateLoginInput } from "@/lib/validation/auth";

const GENERIC_ERROR = "Credenciais inválidas.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const validation = validateLoginInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const email = normalizeEmail(body.email as string);
  const password = body.password as string;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = await createSessionToken({ sub: user.id, role: user.role });

  const response = NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
  response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return response;
}
