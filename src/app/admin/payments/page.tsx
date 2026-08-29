import { prisma } from "@/lib/database/prisma";

const STATUS_COLOR: Record<string, string> = {
  PAID: "text-green-400",
  PENDING: "text-yellow-400",
  FAILED: "text-red-400",
  REFUNDED: "text-zinc-400",
  CANCELLED: "text-zinc-500",
};

export default async function AdminPaymentsPage() {
  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: true, product: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Pagamentos</h1>
      <p className="text-sm text-zinc-500">
        Somente leitura — o status vem sempre do webhook do Mercado Pago,
        nunca é alterado manualmente aqui.
      </p>
      <div className="overflow-x-auto rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 text-zinc-500">
            <tr>
              <th className="px-4 py-2">Usuário</th>
              <th className="px-4 py-2">Produto</th>
              <th className="px-4 py-2">Valor</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Pago em</th>
              <th className="px-4 py-2">ID pagamento MP</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => (
              <tr key={purchase.id} className="border-b border-zinc-900">
                <td className="px-4 py-2">{purchase.user.email}</td>
                <td className="px-4 py-2 text-zinc-400">{purchase.product.name}</td>
                <td className="px-4 py-2">
                  R$ {Number(purchase.amount).toFixed(2).replace(".", ",")}
                </td>
                <td className={`px-4 py-2 ${STATUS_COLOR[purchase.status] ?? ""}`}>
                  {purchase.status}
                </td>
                <td className="px-4 py-2 text-zinc-500">
                  {purchase.paidAt ? new Date(purchase.paidAt).toLocaleString("pt-BR") : "—"}
                </td>
                <td className="px-4 py-2 text-zinc-500">{purchase.externalPaymentId ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
