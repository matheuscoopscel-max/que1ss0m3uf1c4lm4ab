import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/database/prisma";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/categories/[id]">) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
  }

  const updated = await prisma.category.update({
    where: { id },
    data: { active: !category.active },
  });

  return NextResponse.json(updated);
}
