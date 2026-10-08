import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { formatTicketCode, normalizeTicketCode, qrDataUrl } from "@/lib/tickets";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ingresso", robots: { index: false } };

export default async function TicketPage({ params }: { params: { code: string } }) {
  const ticket = await db.ticket.findUnique({
    where: { code: normalizeTicketCode(params.code) },
    include: { event: true, batch: { include: { ticketType: true } } },
  });
  if (!ticket) notFound();
  const qr = await qrDataUrl(ticket.code);

  return (
    <div className="container-page max-w-sm py-10">
      <div className="card space-y-4 text-center">
        <p className="text-xs font-semibold uppercase text-brand-400">{dateTime(ticket.event.startsAt)}</p>
        <h1 className="text-xl font-black">{ticket.event.title}</h1>
        <p className="text-sm text-neutral-400">
          {ticket.event.venueName} · {ticket.event.address} · {ticket.event.city}/{ticket.event.state}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR Code do ingresso" className="mx-auto h-64 w-64 rounded-xl bg-white p-3" />
        <p className="font-mono text-lg tracking-widest text-brand-400">{formatTicketCode(ticket.code)}</p>
        <div>
          <p className="font-bold">
            {ticket.batch.ticketType.name} · {ticket.batch.name}
            {ticket.half && " (meia-entrada)"}
          </p>
          <p className="text-sm text-neutral-300">{ticket.holderName}</p>
        </div>
        {ticket.status === "USED" && <p className="badge bg-neutral-800 text-neutral-300">Já utilizado</p>}
        {ticket.status === "CANCELLED" && <p className="badge bg-red-950 text-red-300">Cancelado</p>}
        {ticket.half && <p className="text-xs text-neutral-500">Leve documento que comprove o direito à meia-entrada.</p>}
      </div>
    </div>
  );
}
