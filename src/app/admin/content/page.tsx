import { prisma } from "@/lib/database/prisma";
import { ContentForm } from "./content-form";
import { ToggleContentActive } from "./toggle-content-active";

export default async function AdminContentPage() {
  const [contents, categories] = await Promise.all([
    prisma.content.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { category: true },
    }),
    prisma.category.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Conteúdo</h1>
      <p className="text-sm text-zinc-500">
        Upload direto pelo painel ainda não existe (depende do R2 estar
        provisionado). Por enquanto, cadastre a `storageKey` manualmente
        depois de subir o arquivo.
      </p>
      {categories.length === 0 ? (
        <p className="text-zinc-400">Crie uma categoria antes de adicionar conteúdo.</p>
      ) : (
        <ContentForm categories={categories} />
      )}
      <div className="overflow-x-auto rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 text-zinc-500">
            <tr>
              <th className="px-4 py-2">Título</th>
              <th className="px-4 py-2">Categoria</th>
              <th className="px-4 py-2">Storage key</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {contents.map((content) => (
              <tr key={content.id} className="border-b border-zinc-900">
                <td className="px-4 py-2">{content.title}</td>
                <td className="px-4 py-2 text-zinc-400">{content.category.name}</td>
                <td className="px-4 py-2 text-zinc-500">{content.storageKey}</td>
                <td className="px-4 py-2">
                  <span className={content.active ? "text-green-400" : "text-red-400"}>
                    {content.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <ToggleContentActive contentId={content.id} active={content.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
