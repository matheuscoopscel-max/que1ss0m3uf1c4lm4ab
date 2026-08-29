import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { hasLibraryAccess } from "@/lib/permissions/access";
import { prisma } from "@/lib/database/prisma";
import { getSetting } from "@/lib/settings/settings";

export default async function ContentLibraryPage() {
  const user = await requireUser();
  const hasAccess = await hasLibraryAccess(user.id);

  if (!hasAccess) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Biblioteca</h1>
        <p className="text-zinc-400">
          Você ainda não tem acesso à biblioteca de Cortes. Adquira o pack pra
          liberar o acesso vitalício.
        </p>
        <Link
          href="/checkout"
          className="inline-block rounded bg-white px-4 py-2 text-sm font-medium text-black"
        >
          Comprar agora
        </Link>
      </div>
    );
  }

  const [categories, telegramUrl] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: {
        contents: {
          where: { active: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    getSetting("telegram_group_url", process.env.TELEGRAM_GROUP_URL ?? null),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Biblioteca</h1>
        {telegramUrl && (
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-zinc-500"
          >
            Entrar no grupo do Telegram
          </a>
        )}
      </div>

      {categories.length === 0 && (
        <p className="text-zinc-400">Nenhum conteúdo publicado ainda.</p>
      )}

      {categories.map((category) => (
        <section key={category.id} className="space-y-3">
          <h2 className="text-lg font-medium text-zinc-200">{category.name}</h2>
          {category.contents.length === 0 ? (
            <p className="text-sm text-zinc-500">Sem conteúdo nesta categoria ainda.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {category.contents.map((content) => (
                <li
                  key={content.id}
                  className="flex items-center justify-between gap-3 rounded border border-zinc-800 bg-zinc-950 px-4 py-3"
                >
                  <span className="truncate text-sm">{content.title}</span>
                  <a
                    href={`/api/content/${content.id}/download`}
                    className="shrink-0 rounded bg-white px-3 py-1.5 text-xs font-medium text-black"
                  >
                    Baixar
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
