import type { Batch, Coupon, DiscountType, FeePayer } from "@prisma/client";
import { env } from "./env";

export type CartLine = { batch: Pick<Batch, "id" | "priceCents">; quantity: number };

export type Pricing = {
  subtotalCents: number;
  discountCents: number;
  feeCents: number;
  totalCents: number;
  producerCents: number;
  platformCents: number;
};

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
  const subtotalCents = lines.reduce((s, l) => s + l.batch.priceCents * l.quantity, 0);
  const discountCents = couponDiscount(coupon, subtotalCents);
  const net = subtotalCents - discountCents;
  const paidTickets = lines.reduce((s, l) => s + (l.batch.priceCents > 0 ? l.quantity : 0), 0);

  let feeCents = net > 0 ? Math.max(Math.round((net * opts.percent) / 100), opts.minCents * paidTickets) : 0;

  if (feePayer === "BUYER") {
    return { subtotalCents, discountCents, feeCents, totalCents: net + feeCents, producerCents: net, platformCents: feeCents };
  }
  // Produtor absorve: a taxa nunca pode passar do valor líquido
  feeCents = Math.min(feeCents, net);
  return { subtotalCents, discountCents, feeCents, totalCents: net, producerCents: net - feeCents, platformCents: feeCents };
}

export type Commission = { commissionType: DiscountType; commissionValue: number };

/**
 * Comissão do anunciante sobre a venda. PERCENT em centésimos de % sobre o valor dos
 * ingressos já com desconto (sem a taxa de serviço); FIXED em centavos por ingresso pago.
 */
export function calculateCommission(commission: Commission | null, netTicketsCents: number, paidTickets: number): number {
  if (!commission || commission.commissionValue <= 0 || netTicketsCents <= 0) return 0;
  if (commission.commissionType === "PERCENT") return Math.round((netTicketsCents * commission.commissionValue) / 10_000);
  return Math.min(commission.commissionValue * paidTickets, netTicketsCents);
}

export function formatCommission(c: Commission | null): string {
  if (!c || c.commissionValue <= 0) return "Sem comissão";
  if (c.commissionType === "PERCENT") return `${(c.commissionValue / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% por venda`;
  return `${(c.commissionValue / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por ingresso`;
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
