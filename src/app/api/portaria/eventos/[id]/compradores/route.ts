import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { checkinActor, maskDocument } from "@/lib/checkin";
import { db } from "@/lib/db";
import { normalizeTicketCode } from "@/lib/tickets";

export const dynamic = "force-dynamic";

/** Lista de quem comprou (para a portaria conferir). Busca por nome, CPF, e-mail ou código. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const actor = await checkinActor(params.id);
  if (!actor) return NextResponse.json({ error: "Faça login novamente" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const filter = url.searchParams.get("status");
  const page = Math.max(1, Number(url.searchParams.get("p")) || 1);
  const digits = q.replace(/\D/g, "");

  const where: Prisma.TicketWhereInput = {
    eventId: actor.eventId,
    status: filter === "USED" ? "USED" : filter === "VALID" ? "VALID" : { not: "CANCELLED" },
    ...(q
      ? {
          OR: [
            { holderName: { contains: q, mode: "insensitive" } },
            { order: { buyerEmail: { contains: q.toLowerCase() } } },
            ...(digits.length >= 6 ? [{ order: { buyerDocument: { contains: digits } } }] : []),
            ...(q.length >= 8 ? [{ code: normalizeTicketCode(q) }] : []),
          ],
        }
      : {}),
  };

  const [tickets, total, used, all] = await Promise.all([
    db.ticket.findMany({
      where,
      orderBy: [{ holderName: "asc" }, { createdAt: "asc" }],
      take: 50,
      skip: (page - 1) * 50,
      select: {
        id: true,
        holderName: true,
        status: true,
        checkedInAt: true,
        checkedInBy: true,
        batch: { select: { name: true, ticketType: { select: { name: true } } } },
        order: { select: { buyerDocument: true, buyerEmail: true } },
      },
    }),
    db.ticket.count({ where }),
    db.ticket.count({ where: { eventId: actor.eventId, status: "USED" } }),
    db.ticket.count({ where: { eventId: actor.eventId, status: { not: "CANCELLED" } } }),
  ]);

  return NextResponse.json({
    total,
    page,
    counts: { used, all },
    tickets: tickets.map((t) => ({
      id: t.id,
      name: t.holderName,
      document: maskDocument(t.order.buyerDocument),
      email: t.order.buyerEmail.replace(/^(.{2}).*(@.*)$/, "$1***$2"),
      type: `${t.batch.ticketType.name} - ${t.batch.name}`,
      status: t.status,
      checkedInAt: t.checkedInAt,
      checkedInBy: t.checkedInBy,
    })),
  });
}
