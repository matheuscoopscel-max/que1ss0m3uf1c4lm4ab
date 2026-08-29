import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/database/prisma";

export async function POST(request: Request, ctx: RouteContext<"/api/admin/users/[id]/role">) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const role = body?.role;
  if (role !== "USER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Role inválida." }, { status: 400 });
  }

  if (id === admin.id && role === "USER") {
    return NextResponse.json({ error: "Você não pode remover seu próprio acesso de admin." }, { status: 400 });
  }

  const updated = await prisma.user.update({ where: { id }, data: { role } });
  return NextResponse.json({ id: updated.id, role: updated.role });
}
