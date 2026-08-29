import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/database/prisma";

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const categoryId = typeof body?.categoryId === "string" ? body.categoryId : "";
  const storageKey = typeof body?.storageKey === "string" ? body.storageKey.trim() : "";

  if (title.length < 2 || !categoryId || storageKey.length < 1) {
    return NextResponse.json({ error: "Título, categoria e storageKey são obrigatórios." }, { status: 400 });
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
  }

  const baseSlug = slugify(title);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.content.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const content = await prisma.content.create({
    data: { title, slug, categoryId, storageKey },
  });

  return NextResponse.json(content, { status: 201 });
}
