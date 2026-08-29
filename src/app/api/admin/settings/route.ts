import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { setSetting } from "@/lib/settings/settings";

const ALLOWED_KEYS = ["telegram_group_url", "instagram_url"];

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const key = body?.key;
  const value = body?.value;

  if (typeof key !== "string" || !ALLOWED_KEYS.includes(key) || typeof value !== "string") {
    return NextResponse.json({ error: "Chave ou valor inválido." }, { status: 400 });
  }

  await setSetting(key, value);
  return NextResponse.json({ ok: true });
}
