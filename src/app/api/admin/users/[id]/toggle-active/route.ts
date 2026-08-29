import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/database/prisma";

export async function POST(_request: Request, ctx: RouteContext<"/api/admin/users/[id]/toggle-active">) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { active: !user.active },
  });

  return NextResponse.json({ id: updated.id, active: updated.active });
}
