import { prisma } from "@/lib/database/prisma";
import { UserRowActions } from "./user-row-actions";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
      <div className="overflow-x-auto rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 text-zinc-500">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-zinc-900">
                <td className="px-4 py-2">{user.name}</td>
                <td className="px-4 py-2 text-zinc-400">{user.email}</td>
                <td className="px-4 py-2">{user.role}</td>
                <td className="px-4 py-2">
                  <span className={user.active ? "text-green-400" : "text-red-400"}>
                    {user.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <UserRowActions userId={user.id} active={user.active} role={user.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
