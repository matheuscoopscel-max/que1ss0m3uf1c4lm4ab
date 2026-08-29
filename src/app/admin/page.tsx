import { prisma } from "@/lib/database/prisma";

export default async function AdminDashboardPage() {
  const [userCount, paidCount, revenue, downloadCount, pendingCount] = await Promise.all([
    prisma.user.count(),
    prisma.purchase.count({ where: { status: "PAID" } }),
    prisma.purchase.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.download.count(),
    prisma.purchase.count({ where: { status: "PENDING" } }),
  ]);

  const cards = [
    { label: "Usuários", value: userCount },
    { label: "Vendas pagas", value: paidCount },
    {
      label: "Faturamento",
      value: `R$ ${Number(revenue._sum.amount ?? 0).toFixed(2).replace(".", ",")}`,
    },
    { label: "Downloads", value: downloadCount },
    { label: "Compras pendentes", value: pendingCount },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs text-zinc-500">{card.label}</p>
            <p className="mt-1 text-xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
