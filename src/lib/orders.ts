import { Prisma, type PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { env } from "./env";
import { onlyDigits } from "./format";
import { paymentProvider, type CardInput } from "./payments";
import { calculatePricing, currentBatch, type CartLine } from "./pricing";
import { newTicketCode } from "./tickets";

export class CheckoutError extends Error {}

export const checkoutSchema = z.object({
  eventId: z.string().min(1),
  items: z
    .array(z.object({ batchId: z.string().min(1), quantity: z.number().int().min(1).max(50), half: z.boolean().default(false) }))
    .min(1)
    .max(20),
  couponCode: z.string().trim().max(40).optional(),
  buyer: z.object({
    name: z.string().trim().min(3).max(120),
    email: z.string().trim().toLowerCase().email().max(160),
    document: z.string().transform(onlyDigits).pipe(z.string().regex(/^(\d{11}|\d{14})$/, "CPF/CNPJ inválido")),
    phone: z.string().transform(onlyDigits).pipe(z.string().min(10).max(13)),
  }),
  paymentMethod: z.enum(["PIX", "CREDIT_CARD", "DEBIT_CARD"]),
  installments: z.number().int().min(1).max(12).default(1),
  card: z.object({ token: z.string().min(1) }).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Busca cupom válido pelo código (case-insensitive). Retorna null se inexistente/expirado/esgotado. */
export async function findValidCoupon(eventId: string, code: string | undefined | null) {
  if (!code) return null;
  const coupon = await db.coupon.findUnique({
    where: { eventId_code: { eventId, code: code.trim().toUpperCase() } },
    include: { advertiser: true },
  });
  if (!coupon || !coupon.active) return null;
  if (coupon.validUntil && coupon.validUntil < new Date()) return null;
  if (coupon.maxUses != null && coupon.uses >= coupon.maxUses) return null;
  return coupon;
}

/**
 * Cria o pedido reservando os ingressos.
 * A reserva usa UPDATE condicional no Postgres (sold + n <= quantity), então
 * duas compras simultâneas nunca vendem além do estoque, sem lock global.
 */
export async function createOrder(input: CheckoutInput) {
  const event = await db.event.findUnique({
    where: { id: input.eventId },
    include: { producer: true, ticketTypes: { where: { active: true }, include: { batches: true } } },
  });
  if (!event || event.status !== "PUBLISHED") throw new CheckoutError("Evento indisponível");
  if ((event.endsAt ?? event.startsAt) < new Date()) throw new CheckoutError("Este evento já aconteceu");

  // Agrupa itens repetidos
  const merged = new Map<string, { batchId: string; quantity: number; half: boolean }>();
  for (const it of input.items) {
    const key = `${it.batchId}:${it.half}`;
    const prev = merged.get(key);
    merged.set(key, { ...it, quantity: (prev?.quantity ?? 0) + it.quantity });
  }

  const lines: (CartLine & { description: string })[] = [];
  const perBatch = new Map<string, number>();
  for (const it of Array.from(merged.values())) {
    const type = event.ticketTypes.find((t) => t.batches.some((b) => b.id === it.batchId));
    const batch = type?.batches.find((b) => b.id === it.batchId);
    if (!type || !batch) throw new CheckoutError("Ingresso inválido");
    if (currentBatch(type.batches)?.id !== batch.id) throw new CheckoutError(`${type.name} - ${batch.name} não está mais à venda`);
    if (it.half && batch.halfPriceCents == null) throw new CheckoutError("Meia-entrada indisponível para este lote");
    perBatch.set(batch.id, (perBatch.get(batch.id) ?? 0) + it.quantity);
    if (perBatch.get(batch.id)! > batch.maxPerOrder) throw new CheckoutError(`Máximo de ${batch.maxPerOrder} por pedido em ${type.name}`);
    lines.push({ batch, quantity: it.quantity, half: it.half, description: `${type.name} - ${batch.name}${it.half ? " (meia)" : ""}` });
  }

  const coupon = input.couponCode ? await findValidCoupon(event.id, input.couponCode) : null;
  if (input.couponCode && !coupon) throw new CheckoutError("Cupom inválido ou esgotado");

  const pricing = calculatePricing(lines, coupon, event.feePayer);
  const isFree = pricing.totalCents === 0;
  const method: PaymentMethod = isFree ? "FREE" : input.paymentMethod;
  if (!isFree && method !== "PIX" && !input.card?.token) throw new CheckoutError("Dados do cartão ausentes");
  if (!isFree && env.paymentProvider === "pagarme" && !event.producer.recipientId) {
    throw new CheckoutError("O produtor ainda não ativou o recebimento. Tente mais tarde.");
  }
  const installments = method === "CREDIT_CARD" ? input.installments : 1;

  const order = await db.$transaction(
    async (tx) => {
      for (const [batchId, qty] of Array.from(perBatch.entries())) {
        const n = await tx.$executeRaw`
          UPDATE "Batch" SET "sold" = "sold" + ${qty}
          WHERE "id" = ${batchId} AND "sold" + ${qty} <= "quantity"`;
        if (n === 0) throw new CheckoutError("Ingressos esgotados para a quantidade escolhida");
      }
      if (coupon) {
        const n = await tx.$executeRaw`
          UPDATE "Coupon" SET "uses" = "uses" + 1
          WHERE "id" = ${coupon.id} AND ("maxUses" IS NULL OR "uses" < "maxUses")`;
        if (n === 0) throw new CheckoutError("Cupom esgotado");
      }
      return tx.order.create({
        data: {
          eventId: event.id,
          paymentMethod: method,
          installments,
          buyerName: input.buyer.name,
          buyerEmail: input.buyer.email,
          buyerDocument: input.buyer.document,
          buyerPhone: input.buyer.phone,
          couponId: coupon?.id,
          advertiserId: coupon?.advertiserId,
          ...pricing,
          expiresAt: new Date(Date.now() + env.reservationMinutes * 60_000),
          items: {
            create: lines.map((l) => ({
              batchId: l.batch.id,
              quantity: l.quantity,
              half: l.half,
              unitPriceCents: l.half ? l.batch.halfPriceCents! : l.batch.priceCents,
            })),
          },
        },
        include: { items: true },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 10_000 },
  );

  if (isFree) {
    await markOrderPaid(order.id);
    return order;
  }

  const card: CardInput | undefined = input.card ? { token: input.card.token, installments } : undefined;
  try {
    const result = await paymentProvider().createPayment({
      order: {
        ...order,
        items: order.items.map((i) => ({
          ...i,
          description: lines.find((l) => l.batch.id === i.batchId && l.half === i.half)!.description,
        })),
      },
      event,
      producer: event.producer,
      card,
    });
    await db.order.update({
      where: { id: order.id },
      data: {
        gatewayOrderId: result.gatewayOrderId,
        gatewayChargeId: result.gatewayChargeId,
        pixQrCode: result.pixQrCode,
        pixQrCodeUrl: result.pixQrCodeUrl,
        authUrl: result.authUrl,
      },
    });
    if (result.status === "paid") await markOrderPaid(order.id);
    else if (result.status === "failed" || result.status === "canceled")
      await releaseOrder(order.id, "FAILED", result.failureReason ?? "Pagamento recusado");
  } catch (err) {
    console.error("[checkout] erro no gateway", order.id, err);
    await releaseOrder(order.id, "FAILED", "Não foi possível processar o pagamento");
    throw new CheckoutError("Não foi possível processar o pagamento. Tente novamente.");
  }
  return order;
}

/** Devolve o estoque e o uso do cupom de um pedido pendente. Idempotente. */
export async function releaseOrder(orderId: string, status: "FAILED" | "EXPIRED" | "CANCELLED", reason?: string) {
  await db.$transaction(async (tx) => {
    const changed = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status, failureReason: reason },
    });
    if (changed.count === 0) return;
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    for (const item of order.items) {
      await tx.$executeRaw`UPDATE "Batch" SET "sold" = GREATEST("sold" - ${item.quantity}, 0) WHERE "id" = ${item.batchId}`;
    }
    if (order.couponId) {
      await tx.$executeRaw`UPDATE "Coupon" SET "uses" = GREATEST("uses" - 1, 0) WHERE "id" = ${order.couponId}`;
    }
  });
}

/**
 * Confirma o pagamento e emite os ingressos. Idempotente: só a primeira chamada emite.
 * Se o pedido já tinha expirado (Pix pago no último segundo), re-reserva o estoque.
 */
export async function markOrderPaid(orderId: string) {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.status === "PAID") return;
    if (!["PENDING", "EXPIRED", "FAILED"].includes(order.status)) return;

    const changed = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: "PAID", paidAt: new Date(), failureReason: null },
    });
    if (changed.count === 0) return;

    if (order.status !== "PENDING") {
      // O estoque tinha sido devolvido: o dinheiro já entrou, então reserva de novo
      for (const item of order.items) {
        await tx.$executeRaw`UPDATE "Batch" SET "sold" = "sold" + ${item.quantity} WHERE "id" = ${item.batchId}`;
      }
      if (order.couponId) await tx.$executeRaw`UPDATE "Coupon" SET "uses" = "uses" + 1 WHERE "id" = ${order.couponId}`;
    }

    await tx.ticket.createMany({
      data: order.items.flatMap((item) =>
        Array.from({ length: item.quantity }, () => ({
          code: newTicketCode(),
          orderId: order.id,
          eventId: order.eventId,
          batchId: item.batchId,
          half: item.half,
          holderName: order.buyerName,
        })),
      ),
    });
  });
}

/** Expira pedidos pendentes vencidos (chamado pelo cron e também sob demanda). */
export async function expireStaleOrders(limit = 500) {
  // 2 min de folga para o webhook do Pix chegar
  const cutoff = new Date(Date.now() - 2 * 60_000);
  const stale = await db.order.findMany({
    where: { status: "PENDING", expiresAt: { lt: cutoff } },
    select: { id: true },
    take: limit,
  });
  for (const o of stale) await releaseOrder(o.id, "EXPIRED", "Tempo para pagamento esgotado");
  return stale.length;
}

/** Sincroniza com o gateway (usado pelo webhook e pelo polling da tela de pagamento). */
export async function syncOrderWithGateway(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order?.gatewayOrderId || order.status === "REFUNDED") return order?.status;
  const status = await paymentProvider().getStatus(order.gatewayOrderId);
  if (status === "paid") await markOrderPaid(order.id);
  else if (status === "refunded") await markOrderRefunded(order.id);
  else if (status === "failed" || status === "canceled") await releaseOrder(order.id, "FAILED", "Pagamento não aprovado");
  return (await db.order.findUnique({ where: { id: orderId }, select: { status: true } }))?.status;
}

/** Estorno confirmado pelo gateway: cancela os ingressos. */
export async function markOrderRefunded(orderId: string) {
  await db.$transaction(async (tx) => {
    const changed = await tx.order.updateMany({ where: { id: orderId, status: "PAID" }, data: { status: "REFUNDED" } });
    if (changed.count === 0) return;
    await tx.ticket.updateMany({ where: { orderId }, data: { status: "CANCELLED" } });
  });
}
