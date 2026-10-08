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
  const ev = ticket.event;

  return (
    <div className="container-page max-w-sm py-10" style={{ "--accent": ev.accentColor } as React.CSSProperties}>
      <div className="card overflow-hidden p-0 text-center">
        <div className="bg-[var(--accent)] px-5 py-4 text-white">
          <p className="text-xs font-semibold uppercase opacity-90">{dateTime(ev.startsAt)}</p>
          <h1 className="text-xl font-extrabold">{ev.title}</h1>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm text-slate-600">
            {ev.venueName} · {ev.address} · {ev.city}/{ev.state}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR Code do ingresso" className={`mx-auto h-64 w-64 ${ticket.status !== "VALID" ? "opacity-30" : ""}`} />
          <p className="font-mono text-lg tracking-widest text-[var(--accent)]">{formatTicketCode(ticket.code)}</p>
          <div>
            <p className="font-bold">
              {ticket.batch.ticketType.name} · {ticket.batch.name}
            </p>
            <p className="text-sm text-slate-700">{ticket.holderName}</p>
          </div>
          {ticket.status === "USED" && <p className="badge bg-slate-100 text-slate-700">Já utilizado</p>}
          {ticket.status === "CANCELLED" && <p className="badge bg-red-50 text-red-700">Cancelado</p>}
          <p className="border-t border-dashed border-slate-200 pt-3 text-xs text-slate-500">
            Proibido para menores de {ev.minAge} anos. Apresente documento oficial com foto. Válido para uma entrada.
          </p>
        </div>
      </div>
    </div>
  );
}
