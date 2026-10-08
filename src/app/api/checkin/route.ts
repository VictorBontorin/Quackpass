import { NextResponse } from "next/server";
import { z } from "zod";
import { checkinActor } from "@/lib/checkin";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { normalizeTicketCode } from "@/lib/tickets";

export const dynamic = "force-dynamic";

const schema = z.object({
  eventId: z.string().min(1),
  /** Código lido no QR ou digitado */
  code: z.string().min(4).max(300).optional(),
  /** Entrada manual pela lista de compradores */
  ticketId: z.string().min(1).optional(),
});

/**
 * Valida um ingresso na portaria (produtor ou equipe dele). O UPDATE condicional
 * (status = VALID) garante que o mesmo ingresso nunca entra duas vezes, mesmo com vários leitores.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.code && !parsed.data.ticketId)) {
    return NextResponse.json({ result: "error", message: "Código inválido" }, { status: 400 });
  }
  const actor = await checkinActor(parsed.data.eventId);
  if (!actor) return NextResponse.json({ result: "error", message: "Faça login novamente" }, { status: 401 });

  const ticket = await db.ticket.findUnique({
    where: parsed.data.ticketId ? { id: parsed.data.ticketId } : { code: normalizeTicketCode(parsed.data.code!) },
    include: { batch: { include: { ticketType: true } } },
  });

  if (!ticket) return NextResponse.json({ result: "invalid", message: "Ingresso não encontrado" });
  if (ticket.eventId !== actor.eventId) return NextResponse.json({ result: "invalid", message: "Ingresso de outro evento" });

  const info = { holderName: ticket.holderName, ticketType: `${ticket.batch.ticketType.name} - ${ticket.batch.name}` };
  if (ticket.status === "CANCELLED") return NextResponse.json({ result: "invalid", message: "Ingresso cancelado (reembolsado)", ...info });

  const updated = await db.ticket.updateMany({
    where: { id: ticket.id, status: "VALID" },
    data: { status: "USED", checkedInAt: new Date(), checkedInBy: actor.name },
  });
  if (updated.count === 0) {
    const used = await db.ticket.findUnique({ where: { id: ticket.id }, select: { checkedInAt: true, checkedInBy: true } });
    return NextResponse.json({
      result: "used",
      message: `Já utilizado${used?.checkedInAt ? ` em ${dateTime(used.checkedInAt)}` : ""}${used?.checkedInBy ? ` por ${used.checkedInBy}` : ""}`,
      ...info,
    });
  }
  return NextResponse.json({ result: "ok", message: "Entrada liberada", ...info });
}
