import "server-only";
import { prisma } from "@/lib/database/prisma";

// Decisão de produto (Fase 3, A9.txt): o schema não liga Product a
// Category/Content — é um pack único ("Cortes", R$14,90) que libera a
// biblioteca inteira, não acesso por categoria. Qualquer Access ativo
// e não expirado do usuário já libera tudo.
export async function hasLibraryAccess(userId: string): Promise<boolean> {
  const access = await prisma.access.findFirst({
    where: {
      userId,
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  return access !== null;
}
