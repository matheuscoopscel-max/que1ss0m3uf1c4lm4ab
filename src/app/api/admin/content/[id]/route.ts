import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/database/prisma";

export async function PATCH(_request: Request, ctx: RouteContext<"/api/admin/content/[id]">) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const content = await prisma.content.findUnique({ where: { id } });
  if (!content) {
    return NextResponse.json({ error: "Conteúdo não encontrado." }, { status: 404 });
  }

  const updated = await prisma.content.update({
    where: { id },
    data: { active: !content.active },
  });

  return NextResponse.json(updated);
}
