import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { requireUser } from "@/lib/auth/guards";
import { hasLibraryAccess } from "@/lib/permissions/access";
import { prisma } from "@/lib/database/prisma";
import { getSignedDownloadUrl } from "@/lib/storage/r2";

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export async function GET(_request: Request, ctx: RouteContext<"/api/content/[id]/download">) {
  const { id } = await ctx.params;

  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const allowed = await hasLibraryAccess(user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Sem acesso à biblioteca." }, { status: 403 });
  }

  const content = await prisma.content.findUnique({ where: { id } });
  if (!content || !content.active) {
    return NextResponse.json({ error: "Conteúdo não encontrado." }, { status: 404 });
  }

  let signedUrl: string;
  try {
    signedUrl = await getSignedDownloadUrl(content.storageKey);
  } catch (error) {
    console.error("Falha ao gerar URL assinada:", error);
    return NextResponse.json(
      { error: "Erro ao gerar link de download. Tente novamente." },
      { status: 500 }
    );
  }

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = requestHeaders.get("user-agent") ?? undefined;

  await prisma.download.create({
    data: {
      userId: user.id,
      contentId: content.id,
      ipHash: hashIp(ip),
      userAgent,
    },
  });

  return NextResponse.redirect(signedUrl);
}
