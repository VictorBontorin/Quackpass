import Link from "next/link";
import { requireProducer } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, dateTime } from "@/lib/format";
import { Stat } from "@/components/Stat";
import { StatusBadge } from "./StatusBadge";

export default async function PanelHome() {
  const producer = await requireProducer();
  const events = await db.event.findMany({ where: { producerId: producer.id }, orderBy: { startsAt: "desc" } });
  const ids = events.map((e) => e.id);

  const [sales, tickets] = await Promise.all([
    db.order.groupBy({
      by: ["eventId"],
      where: { eventId: { in: ids }, status: "PAID" },
      _sum: { producerCents: true },
      _count: true,
    }),
    db.ticket.groupBy({ by: ["eventId", "status"], where: { eventId: { in: ids } }, _count: true }),
  ]);
  const revenueBy = new Map(sales.map((s) => [s.eventId, s._sum.producerCents ?? 0]));
  const ticketsBy = (id: string) => tickets.filter((t) => t.eventId === id && t.status !== "CANCELLED").reduce((s, t) => s + t._count, 0);
  const totalRevenue = sales.reduce((s, x) => s + (x._sum.producerCents ?? 0), 0);
  const totalTickets = tickets.filter((t) => t.status !== "CANCELLED").reduce((s, t) => s + t._count, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Você recebe (pedidos pagos)" value={brl(totalRevenue)} />
        <Stat label="Ingressos emitidos" value={String(totalTickets)} />
        <Stat label="Eventos" value={String(events.length)} />
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black">Seus eventos</h1>
        <Link href="/painel/eventos/novo" className="btn-primary">
          + Novo evento
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card text-neutral-400">Você ainda não criou nenhum evento.</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Data</th>
                <th>Status</th>
                <th className="text-right">Ingressos</th>
                <th className="text-right">Você recebe</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-neutral-900">
                  <td>
                    <Link href={`/painel/eventos/${e.id}`} className="font-semibold hover:text-brand-400">
                      {e.title}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-neutral-400">{dateTime(e.startsAt)}</td>
                  <td>
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="text-right">{ticketsBy(e.id)}</td>
                  <td className="text-right">{brl(revenueBy.get(e.id) ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
