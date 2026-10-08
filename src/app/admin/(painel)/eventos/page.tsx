import Link from "next/link";
import type { EventStatus, Prisma } from "@prisma/client";
import { CancelEvent } from "@/components/CancelEvent";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { brl, dateTime } from "@/lib/format";
import { StatusBadge } from "@/app/painel/StatusBadge";
import { adminCancelEvent, adminUnpublishEvent } from "../../actions";

export default async function AdminEvents({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  const status = (["DRAFT", "PUBLISHED", "CANCELLED"].includes(searchParams.status ?? "") ? searchParams.status : undefined) as EventStatus | undefined;
  const q = searchParams.q?.trim();
  const where: Prisma.EventWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { producer: { name: { contains: q, mode: "insensitive" } } }, { city: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const events = await db.event.findMany({ where, orderBy: { startsAt: "desc" }, take: 200, include: { producer: { select: { id: true, name: true } } } });
  const sales = await db.order.groupBy({
    by: ["eventId"],
    where: { eventId: { in: events.map((e) => e.id) }, status: "PAID" },
    _sum: { totalCents: true, platformCents: true },
    _count: true,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Eventos</h1>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Evento, produtor ou cidade" className="input w-64 py-2" />
        <select name="status" defaultValue={status ?? ""} className="input w-40 py-2">
          <option value="">Todos</option>
          <option value="PUBLISHED">À venda</option>
          <option value="DRAFT">Rascunho</option>
          <option value="CANCELLED">Cancelados</option>
        </select>
        <button className="btn-secondary py-2">Filtrar</button>
      </form>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Produtor</th>
              <th>Data</th>
              <th>Status</th>
              <th className="text-right">Vendido</th>
              <th className="text-right">Sua receita</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const s = sales.find((x) => x.eventId === e.id);
              return (
                <tr key={e.id}>
                  <td>
                    <a href={`${env.appUrl}/evento/${e.slug}`} target="_blank" className="font-medium hover:text-brand-700">
                      {e.title}
                    </a>
                    <p className="text-xs text-slate-500">
                      {e.city}/{e.state}
                    </p>
                  </td>
                  <td>
                    <Link href={`/admin/produtores/${e.producer.id}`} className="hover:text-brand-700">
                      {e.producer.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-slate-500">{dateTime(e.startsAt)}</td>
                  <td>
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="text-right">
                    {brl(s?._sum.totalCents ?? 0)}
                    <p className="text-xs text-slate-500">{s?._count ?? 0} pedidos</p>
                  </td>
                  <td className="text-right">{brl(s?._sum.platformCents ?? 0)}</td>
                  <td>
                    <div className="flex justify-end gap-2">
                      {e.status === "PUBLISHED" && (
                        <form action={adminUnpublishEvent.bind(null, e.id)}>
                          <button className="btn-secondary px-3 py-1.5 text-xs">Tirar do ar</button>
                        </form>
                      )}
                      {e.status !== "CANCELLED" && <CancelEvent action={adminCancelEvent.bind(null, e.id)} paidOrders={s?._count ?? 0} small />}
                    </div>
                  </td>
                </tr>
              );
            })}
            {events.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-slate-500">
                  Nenhum evento
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
