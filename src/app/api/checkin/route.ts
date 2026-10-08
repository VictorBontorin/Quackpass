import { NextResponse } from "next/server";
import { z } from "zod";
import { currentProducerId } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { normalizeTicketCode } from "@/lib/tickets";

export const dynamic = "force-dynamic";

const schema = z.object({ eventId: z.string().min(1), code: z.string().min(4).max(300) });

/**
 * Valida um ingresso na portaria. O UPDATE condicional (status = VALID) garante
 * que o mesmo QR nunca entra duas vezes, mesmo com vários leitores ao mesmo tempo.
 */
export async function POST(req: Request) {
  const producerId = await currentProducerId();
  if (!producerId) return NextResponse.json({ result: "error", message: "Faça login novamente" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ result: "error", message: "Código inválido" }, { status: 400 });

  const event = await db.event.findFirst({ where: { id: parsed.data.eventId, producerId }, select: { id: true } });
  if (!event) return NextResponse.json({ result: "error", message: "Evento não encontrado" }, { status: 404 });

  const code = normalizeTicketCode(parsed.data.code);
  const ticket = await db.ticket.findUnique({
    where: { code },
    include: { batch: { include: { ticketType: true } }, order: { select: { buyerEmail: true } } },
  });

  if (!ticket) return NextResponse.json({ result: "invalid", message: "Ingresso não encontrado" });
  if (ticket.eventId !== event.id) return NextResponse.json({ result: "invalid", message: "Ingresso de outro evento" });

  const info = {
    holderName: ticket.holderName,
    ticketType: `${ticket.batch.ticketType.name} - ${ticket.batch.name}${ticket.half ? " (MEIA: conferir documento)" : ""}`,
    email: ticket.order.buyerEmail,
  };

  if (ticket.status === "CANCELLED") return NextResponse.json({ result: "invalid", message: "Ingresso cancelado", ...info });

  const updated = await db.ticket.updateMany({
    where: { id: ticket.id, status: "VALID" },
    data: { status: "USED", checkedInAt: new Date() },
  });
  if (updated.count === 0) {
    const used = await db.ticket.findUnique({ where: { id: ticket.id }, select: { checkedInAt: true } });
    return NextResponse.json({
      result: "used",
      message: `Já utilizado${used?.checkedInAt ? ` em ${dateTime(used.checkedInAt)}` : ""}`,
      ...info,
    });
  }
  return NextResponse.json({ result: "ok", message: "Entrada liberada", ...info });
}
