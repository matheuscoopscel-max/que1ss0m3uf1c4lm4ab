import { requireUser } from "@/lib/auth/guards";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Olá, {user.name}</h1>
      <p className="text-zinc-400">
        Sua biblioteca de conteúdo aparece aqui assim que a Fase 3 (Produtos)
        estiver pronta.
      </p>
    </div>
  );
}
