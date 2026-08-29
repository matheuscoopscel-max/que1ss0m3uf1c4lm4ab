import { NextResponse } from "next/server";
import { Preference } from "mercadopago";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/database/prisma";
import { getMercadoPagoClient } from "@/lib/mercadopago/client";
import { checkRateLimit } from "@/lib/security/rate-limit";

const PRODUCT_SLUG = "cortes-vitalicio";

export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!checkRateLimit(`checkout:${user.id}`, { limit: 10, windowMs: 60 * 60_000 })) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente de novo mais tarde." },
      { status: 429 }
    );
  }

  const product = await prisma.product.findUnique({ where: { slug: PRODUCT_SLUG } });
  if (!product || !product.active) {
    return NextResponse.json({ error: "Produto indisponível." }, { status: 404 });
  }

  const existingAccess = await prisma.access.findFirst({
    where: { userId: user.id, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
  });
  if (existingAccess) {
    return NextResponse.json({ error: "Você já tem acesso." }, { status: 409 });
  }

  const purchase = await prisma.purchase.create({
    data: { userId: user.id, productId: product.id, amount: product.price },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const preference = new Preference(getMercadoPagoClient());
    const result = await preference.create({
      body: {
        items: [
          {
            id: product.id,
            title: product.name,
            quantity: 1,
            currency_id: "BRL",
            unit_price: Number(product.price),
          },
        ],
        payer: { email: user.email },
        external_reference: purchase.id,
        notification_url: `${appUrl}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${appUrl}/dashboard/content`,
          pending: `${appUrl}/checkout`,
          failure: `${appUrl}/checkout`,
        },
        // auto_return exige back_url pública (rejeita localhost) — só liga em produção.
        ...(appUrl.startsWith("https://") ? { auto_return: "approved" as const } : {}),
      },
    });

    if (result.id) {
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { externalPaymentId: result.id },
      });
    }

    const checkoutUrl = result.sandbox_init_point ?? result.init_point;
    if (!checkoutUrl) {
      throw new Error("Mercado Pago não retornou init_point.");
    }

    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error("Falha ao criar preferência do Mercado Pago:", error);
    return NextResponse.json(
      { error: "Erro ao iniciar pagamento. Tente novamente." },
      { status: 502 }
    );
  }
}
