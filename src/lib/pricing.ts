import type { Batch, Coupon, FeePayer } from "@prisma/client";
import { env } from "./env";

export type CartLine = { batch: Pick<Batch, "id" | "priceCents" | "halfPriceCents">; quantity: number; half: boolean };

export type Pricing = {
  subtotalCents: number;
  discountCents: number;
  feeCents: number;
  totalCents: number;
  producerCents: number;
  platformCents: number;
};

export function unitPrice(line: CartLine): number {
  if (line.half) {
    if (line.batch.halfPriceCents == null) throw new Error("Este lote não tem meia-entrada");
    return line.batch.halfPriceCents;
  }
  return line.batch.priceCents;
}

export function couponDiscount(coupon: Pick<Coupon, "discountType" | "value"> | null, subtotalCents: number): number {
  if (!coupon || subtotalCents <= 0) return 0;
  const raw =
    coupon.discountType === "PERCENT"
      ? Math.round((subtotalCents * Math.min(coupon.value, 100)) / 100)
      : coupon.value;
  return Math.min(raw, subtotalCents);
}

/**
 * Taxa da plataforma: PLATFORM_FEE_PERCENT sobre o valor (já com desconto),
 * com mínimo de PLATFORM_FEE_MIN_CENTS por ingresso pago. Ingresso gratuito não paga taxa.
 */
export function calculatePricing(
  lines: CartLine[],
  coupon: Pick<Coupon, "discountType" | "value"> | null,
  feePayer: FeePayer,
  opts = { percent: env.platformFeePercent, minCents: env.platformFeeMinCents },
): Pricing {
  const subtotalCents = lines.reduce((s, l) => s + unitPrice(l) * l.quantity, 0);
  const discountCents = couponDiscount(coupon, subtotalCents);
  const net = subtotalCents - discountCents;
  const paidTickets = lines.reduce((s, l) => s + (unitPrice(l) > 0 ? l.quantity : 0), 0);

  let feeCents = net > 0 ? Math.max(Math.round((net * opts.percent) / 100), opts.minCents * paidTickets) : 0;

  if (feePayer === "BUYER") {
    return { subtotalCents, discountCents, feeCents, totalCents: net + feeCents, producerCents: net, platformCents: feeCents };
  }
  // Produtor absorve: a taxa nunca pode passar do valor líquido
  feeCents = Math.min(feeCents, net);
  return { subtotalCents, discountCents, feeCents, totalCents: net, producerCents: net - feeCents, platformCents: feeCents };
}

/** Lote "da vez" de cada tipo: o primeiro ativo, dentro da janela de vendas e com estoque. */
export function isBatchOnSale(b: Pick<Batch, "active" | "sold" | "quantity" | "salesStart" | "salesEnd">, now = new Date()) {
  return (
    b.active &&
    b.sold < b.quantity &&
    (!b.salesStart || b.salesStart <= now) &&
    (!b.salesEnd || b.salesEnd > now)
  );
}

export function currentBatch<B extends Pick<Batch, "active" | "sold" | "quantity" | "salesStart" | "salesEnd" | "sortOrder">>(
  batches: B[],
  now = new Date(),
): B | null {
  return [...batches].sort((a, b) => a.sortOrder - b.sortOrder).find((b) => isBatchOnSale(b, now)) ?? null;
}
