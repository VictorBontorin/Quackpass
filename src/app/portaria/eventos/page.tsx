import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { TopBar } from "../TopBar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Eventos" };

export default async function StaffEvents() {
  const staff = await requireStaff();
  // Eventos de hoje e próximos (inclui os que começaram nas últimas 24h, que ainda podem estar rolando)
  const events = await db.event.findMany({
    where: { producerId: staff.producerId, status: "PUBLISHED", startsAt: { gte: new Date(Date.now() - 24 * 3_600_000) } },
    orderBy: { startsAt: "asc" },
    take: 30,
    select: { id: true, title: true, startsAt: true, venueName: true, _count: { select: { tickets: { where: { status: { not: "CANCELLED" } } } } } },
  });

  return (
    <div>
      <TopBar title={staff.producer.name} subtitle={`Olá, ${staff.name}`} />
      <main className="mx-auto max-w-2xl space-y-3 px-4 py-6">
        <h1 className="text-lg font-bold">Escolha o evento</h1>
        {events.length === 0 && <p className="card text-slate-400">Nenhum evento hoje ou nos próximos dias.</p>}
        {events.map((e) => (
          <Link key={e.id} href={`/portaria/eventos/${e.id}`} className="card block active:bg-slate-800">
            <p className="text-xs font-semibold uppercase text-brand-500">{dateTime(e.startsAt)}</p>
            <p className="text-lg font-bold">{e.title}</p>
            <p className="text-sm text-slate-400">
              {e.venueName} · {e._count.tickets} ingresso(s)
            </p>
          </Link>
        ))}
      </main>
    </div>
  );
}
