import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/database/prisma";
import { CheckoutButton } from "./checkout-button";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const product = await prisma.product.findUnique({ where: { slug: "cortes-vitalicio" } });

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          {product?.name ?? "Cortes — Acesso Vitalício"}
        </h1>
        <p className="text-zinc-400">{product?.description}</p>
        <p className="text-3xl font-semibold">
          R$ {product ? Number(product.price).toFixed(2).replace(".", ",") : "14,90"}
        </p>

        {!user ? (
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Entre ou crie uma conta pra comprar.</p>
            <Link
              href="/login?next=/checkout"
              className="block w-full rounded bg-white px-4 py-2 text-sm font-medium text-black"
            >
              Entrar
            </Link>
            <Link href="/register" className="block text-sm text-zinc-400 underline">
              Criar conta
            </Link>
          </div>
        ) : (
          <CheckoutButton />
        )}
      </div>
    </div>
  );
}
