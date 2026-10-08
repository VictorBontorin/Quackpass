"use server";

import { customAlphabet } from "nanoid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/ActionForm";
import { requireOwnedEvent, requireProducer } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { onlyDigits, parseLocalDateTime, parseMoney, slugify } from "@/lib/format";
import { createPagarmeRecipient } from "@/lib/payments/pagarme";

const suffix = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 5);

const eventSchema = z.object({
  title: z.string().trim().min(3, "Informe o nome do evento").max(140),
  description: z.string().trim().max(5000).default(""),
  venueName: z.string().trim().min(2, "Informe o local").max(120),
  address: z.string().trim().min(3, "Informe o endereço").max(200),
  city: z.string().trim().min(2, "Informe a cidade").max(80),
  state: z.string().trim().length(2, "UF com 2 letras").transform((s) => s.toUpperCase()),
  startsAt: z.string().transform((s, ctx) => {
    const d = parseLocalDateTime(s);
    if (!d) ctx.addIssue({ code: "custom", message: "Data de início inválida" });
    return d!;
  }),
  endsAt: z.string().optional().transform((s) => (s ? parseLocalDateTime(s) : null)),
  bannerUrl: z.string().trim().url("URL do banner inválida").or(z.literal("")).optional(),
  minAge: z.coerce.number().int().min(0).max(21).optional().or(z.literal("")),
  feePayer: z.enum(["BUYER", "PRODUCER"]),
});

function parseEvent(form: FormData) {
  const parsed = eventSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;
  const d = parsed.data;
  return {
    data: {
      title: d.title,
      description: d.description,
      venueName: d.venueName,
      address: d.address,
      city: d.city,
      state: d.state,
      startsAt: d.startsAt,
      endsAt: d.endsAt,
      bannerUrl: d.bannerUrl || null,
      minAge: typeof d.minAge === "number" && d.minAge > 0 ? d.minAge : null,
      feePayer: d.feePayer,
    },
  } as const;
}

export async function createEvent(_prev: ActionState, form: FormData): Promise<ActionState> {
  const producer = await requireProducer();
  const parsed = parseEvent(form);
  if ("error" in parsed) return { error: parsed.error };
  const event = await db.event.create({
    data: { ...parsed.data, producerId: producer.id, slug: `${slugify(parsed.data.title) || "evento"}-${suffix()}` },
  });
  redirect(`/painel/eventos/${event.id}/ingressos`);
}

export async function updateEvent(eventId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const { event } = await requireOwnedEvent(eventId);
  const parsed = parseEvent(form);
  if ("error" in parsed) return { error: parsed.error };
  await db.event.update({ where: { id: event.id }, data: parsed.data });
  revalidatePath(`/evento/${event.slug}`);
  return { ok: "Evento atualizado" };
}

export async function setEventStatus(eventId: string, status: "DRAFT" | "PUBLISHED" | "CANCELLED") {
  const { event, producer } = await requireOwnedEvent(eventId);
  if (status === "PUBLISHED") {
    const hasBatch = await db.batch.count({ where: { ticketType: { eventId: event.id }, active: true } });
    if (!hasBatch) redirect(`/painel/eventos/${event.id}/ingressos?erro=sem-lote`);
    if (env.paymentProvider === "pagarme" && !producer.recipientId) {
      const hasPaid = await db.batch.count({ where: { ticketType: { eventId: event.id }, priceCents: { gt: 0 } } });
      if (hasPaid) redirect(`/painel/conta?erro=sem-recebedor`);
    }
  }
  await db.event.update({ where: { id: event.id }, data: { status } });
  revalidatePath(`/evento/${event.slug}`);
  revalidatePath("/");
  revalidatePath(`/painel/eventos/${event.id}`);
}

// ---------- Tipos de ingresso e lotes ----------

export async function createTicketType(eventId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwnedEvent(eventId);
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Informe o nome (ex.: Pista, VIP, Camarote)" };
  const count = await db.ticketType.count({ where: { eventId } });
  await db.ticketType.create({
    data: { eventId, name, description: String(form.get("description") ?? "").trim(), sortOrder: count },
  });
  revalidatePath(`/painel/eventos/${eventId}/ingressos`);
  return { ok: `${name} criado. Agora adicione os lotes.` };
}

const batchSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do lote").max(60),
  price: z.string().transform((s, ctx) => {
    const v = parseMoney(s || "0");
    if (!Number.isFinite(v) || v < 0) ctx.addIssue({ code: "custom", message: "Preço inválido" });
    return v;
  }),
  halfPrice: z.string().optional().transform((s) => (s ? parseMoney(s) : null)),
  quantity: z.coerce.number().int().min(1, "Quantidade mínima 1").max(1_000_000),
  maxPerOrder: z.coerce.number().int().min(1).max(50).default(10),
  salesStart: z.string().optional().transform((s) => (s ? parseLocalDateTime(s) : null)),
  salesEnd: z.string().optional().transform((s) => (s ? parseLocalDateTime(s) : null)),
});

export async function createBatch(eventId: string, ticketTypeId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwnedEvent(eventId);
  const type = await db.ticketType.findFirst({ where: { id: ticketTypeId, eventId } });
  if (!type) return { error: "Tipo de ingresso não encontrado" };
  const parsed = batchSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.price > 0 && d.price < 100) return { error: "Preço mínimo de R$ 1,00 (ou 0 para gratuito)" };
  if (d.halfPrice != null && (!Number.isFinite(d.halfPrice) || d.halfPrice > d.price)) return { error: "Meia-entrada inválida" };
  const count = await db.batch.count({ where: { ticketTypeId } });
  await db.batch.create({
    data: {
      ticketTypeId,
      name: d.name,
      priceCents: d.price,
      halfPriceCents: d.halfPrice,
      quantity: d.quantity,
      maxPerOrder: d.maxPerOrder,
      salesStart: d.salesStart,
      salesEnd: d.salesEnd,
      sortOrder: count,
    },
  });
  revalidatePath(`/painel/eventos/${eventId}/ingressos`);
  return { ok: "Lote criado" };
}

export async function updateBatchQuantity(eventId: string, batchId: string, form: FormData) {
  await requireOwnedEvent(eventId);
  const quantity = Number(form.get("quantity"));
  const batch = await db.batch.findFirst({ where: { id: batchId, ticketType: { eventId } } });
  // Nunca abaixo do que já foi vendido/reservado
  if (batch && Number.isInteger(quantity) && quantity >= batch.sold) {
    await db.batch.update({ where: { id: batchId }, data: { quantity } });
  }
  revalidatePath(`/painel/eventos/${eventId}/ingressos`);
}

export async function toggleBatch(eventId: string, batchId: string) {
  await requireOwnedEvent(eventId);
  const batch = await db.batch.findFirst({ where: { id: batchId, ticketType: { eventId } } });
  if (batch) await db.batch.update({ where: { id: batchId }, data: { active: !batch.active } });
  revalidatePath(`/painel/eventos/${eventId}/ingressos`);
}

export async function toggleTicketType(eventId: string, ticketTypeId: string) {
  await requireOwnedEvent(eventId);
  const t = await db.ticketType.findFirst({ where: { id: ticketTypeId, eventId } });
  if (t) await db.ticketType.update({ where: { id: t.id }, data: { active: !t.active } });
  revalidatePath(`/painel/eventos/${eventId}/ingressos`);
}

// ---------- Anunciantes e cupons ----------

export async function createAdvertiser(_prev: ActionState, form: FormData): Promise<ActionState> {
  const producer = await requireProducer();
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Informe o nome do anunciante" };
  const clean = (k: string) => String(form.get(k) ?? "").trim() || null;
  await db.advertiser.create({
    data: { producerId: producer.id, name, email: clean("email"), phone: clean("phone"), instagram: clean("instagram") },
  });
  revalidatePath("/painel/anunciantes");
  return { ok: `${name} cadastrado` };
}

const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,30}$/, "Código com 3 a 30 letras/números, sem espaço"),
  advertiserId: z.string().optional(),
  discountType: z.enum(["PERCENT", "FIXED"]),
  value: z.string().min(1, "Informe o desconto"),
  maxUses: z.coerce.number().int().min(1).optional().or(z.literal("")),
  validUntil: z.string().optional(),
});

export async function createCoupon(eventId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const { producer } = await requireOwnedEvent(eventId);
  const parsed = couponSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const value = d.discountType === "PERCENT" ? Math.round(Number(d.value.replace(",", "."))) : parseMoney(d.value);
  if (!Number.isFinite(value) || value < 0 || (d.discountType === "PERCENT" && value > 100)) return { error: "Desconto inválido" };

  let advertiserId: string | null = null;
  if (d.advertiserId) {
    const adv = await db.advertiser.findFirst({ where: { id: d.advertiserId, producerId: producer.id } });
    if (!adv) return { error: "Anunciante inválido" };
    advertiserId = adv.id;
  }
  try {
    await db.coupon.create({
      data: {
        eventId,
        advertiserId,
        code: d.code,
        discountType: d.discountType,
        value,
        maxUses: typeof d.maxUses === "number" ? d.maxUses : null,
        validUntil: d.validUntil ? parseLocalDateTime(d.validUntil) : null,
      },
    });
  } catch {
    return { error: "Já existe um cupom com este código neste evento" };
  }
  revalidatePath(`/painel/eventos/${eventId}/cupons`);
  return { ok: `Cupom ${d.code} criado` };
}

export async function toggleCoupon(eventId: string, couponId: string) {
  await requireOwnedEvent(eventId);
  const c = await db.coupon.findFirst({ where: { id: couponId, eventId } });
  if (c) await db.coupon.update({ where: { id: c.id }, data: { active: !c.active } });
  revalidatePath(`/painel/eventos/${eventId}/cupons`);
}

// ---------- Conta de recebimento ----------

const bankSchema = z.object({
  bankHolder: z.string().trim().min(3, "Informe o titular"),
  bankCode: z.string().transform(onlyDigits).pipe(z.string().length(3, "Código do banco com 3 dígitos")),
  bankBranch: z.string().transform(onlyDigits).pipe(z.string().min(1, "Agência inválida").max(5)),
  bankAccount: z.string().transform(onlyDigits).pipe(z.string().min(1, "Conta inválida").max(13)),
  bankAccountDigit: z.string().trim().min(1, "Informe o dígito").max(2),
  bankAccountType: z.enum(["checking", "savings"]),
});

export async function saveBankAccount(_prev: ActionState, form: FormData): Promise<ActionState> {
  const producer = await requireProducer();
  const parsed = bankSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  let recipientId = producer.recipientId;
  if (env.paymentProvider === "pagarme" && !recipientId) {
    try {
      recipientId = await createPagarmeRecipient({
        name: producer.name,
        email: producer.email,
        document: producer.document,
        phone: producer.phone,
        bank: {
          holder: d.bankHolder,
          code: d.bankCode,
          branch: d.bankBranch,
          account: d.bankAccount,
          digit: d.bankAccountDigit,
          type: d.bankAccountType,
        },
      });
    } catch (err) {
      return { error: `A Pagar.me recusou os dados: ${err instanceof Error ? err.message : "erro desconhecido"}` };
    }
  } else if (env.paymentProvider === "mock" && !recipientId) {
    recipientId = `mock_rp_${producer.id}`;
  }
  await db.producer.update({ where: { id: producer.id }, data: { ...d, recipientId } });
  revalidatePath("/painel/conta");
  return { ok: "Conta de recebimento ativa" };
}
