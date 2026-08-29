import { NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { prisma } from "@/lib/database/prisma";
import { getMercadoPagoClient } from "@/lib/mercadopago/client";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

// Nunca confia no corpo do webhook: só usa `data.id` pra buscar o pagamento
// de verdade na API do Mercado Pago (autenticado com nosso access token) e
// trata essa resposta como única fonte de verdade — conforme A9.txt.
export async function POST(request: Request) {
  // Limite generoso — o MP reenvia webhook em rajada quando um evento
  // muda de status várias vezes seguidas; isso é só proteção contra
  // flood malicioso, não deve travar retry legítimo.
  const ip = getClientIp(request);
  if (!checkRateLimit(`webhook:${ip}`, { limit: 120, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Rate limit excedido." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const paymentId = body?.data?.id;
  const type = body?.type ?? body?.action;

  if (type !== "payment" || !paymentId) {
    return NextResponse.json({ received: true, ignored: true });
  }

  let payment;
  try {
    const paymentClient = new Payment(getMercadoPagoClient());
    payment = await paymentClient.get({ id: paymentId });
  } catch (error) {
    console.error("Falha ao consultar pagamento no Mercado Pago:", error);
    return NextResponse.json({ error: "Falha ao consultar pagamento." }, { status: 502 });
  }

  const purchaseId = payment.external_reference;
  if (!purchaseId) {
    console.error("Webhook sem external_reference:", paymentId);
    return NextResponse.json({ received: true, ignored: true });
  }

  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) {
    console.error("Purchase não encontrada pro external_reference:", purchaseId);
    return NextResponse.json({ received: true, ignored: true });
  }

  const expectedAmount = Number(purchase.amount);
  const receivedAmount = payment.transaction_amount ?? 0;
  if (Math.abs(receivedAmount - expectedAmount) > 0.01) {
    console.error(
      `Valor do pagamento ${paymentId} (${receivedAmount}) diverge do esperado (${expectedAmount}) pra purchase ${purchaseId}.`
    );
    return NextResponse.json({ received: true, ignored: true });
  }

  if (payment.status === "approved") {
    const updateResult = await prisma.purchase.updateMany({
      where: { id: purchase.id, status: { not: "PAID" } },
      data: { status: "PAID", paidAt: new Date(), externalPaymentId: String(payment.id) },
    });

    if (updateResult.count > 0) {
      await prisma.access.upsert({
        where: { purchaseId: purchase.id },
        update: {},
        create: { userId: purchase.userId, productId: purchase.productId, purchaseId: purchase.id },
      });
    }
  } else if (payment.status === "rejected" || payment.status === "cancelled") {
    await prisma.purchase.updateMany({
      where: { id: purchase.id, status: { notIn: ["PAID"] } },
      data: { status: payment.status === "rejected" ? "FAILED" : "CANCELLED" },
    });
  }

  return NextResponse.json({ received: true });
}
