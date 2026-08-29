import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Olá, {user.name}</h1>
      <p className="text-zinc-400">Acesse sua biblioteca de Cortes ou gerencie sua conta.</p>
      <Link
        href="/dashboard/content"
        className="inline-block rounded bg-white px-4 py-2 text-sm font-medium text-black"
      >
        Ir pra biblioteca
      </Link>
    </div>
  );
}
