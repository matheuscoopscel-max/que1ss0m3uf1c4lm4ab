import { prisma } from "@/lib/database/prisma";
import { CategoryForm } from "./category-form";
import { ToggleActiveButton } from "./toggle-active-button";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { contents: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
      <CategoryForm />
      <div className="overflow-x-auto rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 text-zinc-500">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Conteúdos</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className="border-b border-zinc-900">
                <td className="px-4 py-2">{category.name}</td>
                <td className="px-4 py-2 text-zinc-400">{category._count.contents}</td>
                <td className="px-4 py-2">
                  <span className={category.active ? "text-green-400" : "text-red-400"}>
                    {category.active ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <ToggleActiveButton categoryId={category.id} active={category.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
