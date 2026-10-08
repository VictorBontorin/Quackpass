import Link from "next/link";
import { Stat } from "@/components/Stat";
import { db } from "@/lib/db";
import { brl, dateTime } from "@/lib/format";
import { ProducerBadge } from "./ProducerBadge";

export default async function AdminHome() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [all, month, producers, leads, upcoming, refunds] = await Promise.all([
    db.order.aggregate({ where: { status: "PAID" }, _sum: { totalCents: true, platformCents: true }, _count: true }),
    db.order.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart } }, _sum: { totalCents: true, platformCents: true }, _count: true }),
    db.producer.groupBy({ by: ["status"], _count: true }),
    db.producer.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.event.count({ where: { status: "PUBLISHED", startsAt: { gte: new Date() } } }),
    db.order.count({ where: { status: "PAID", refundError: { not: null } } }),
  ]);
  const count = (st: string) => producers.find((p) => p.status === st)?._count ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Visão geral</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sua receita no mês" value={brl(month._sum.platformCents ?? 0)} hint={`Total: ${brl(all._sum.platformCents ?? 0)}`} />
        <Stat label="Vendido no mês" value={brl(month._sum.totalCents ?? 0)} hint={`${month._count} pedidos pagos`} />
        <Stat label="Produtores ativos" value={String(count("APPROVED"))} hint={`${count("PENDING")} aguardando aprovação`} />
        <Stat label="Eventos à venda" value={String(upcoming)} />
      </div>

      {refunds > 0 && (
        <div className="card border-red-200 bg-red-50 text-sm text-red-900">
          {refunds} reembolso(s) recusado(s) pelo gateway aguardando nova tentativa.{" "}
          <Link href="/admin/pedidos?falha=1" className="font-semibold underline">
            Ver pedidos
          </Link>
        </div>
      )}

      <section className="card p-0">
        <div className="flex items-center justify-between p-4">
          <h2 className="section-title">Novos cadastros para aprovar</h2>
          <Link href="/admin/produtores?status=PENDING" className="text-sm font-medium text-brand-700">
            Ver todos
          </Link>
        </div>
        {leads.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-slate-500">Nenhum cadastro pendente.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {leads.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/produtores/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-slate-500">
                      {p.contactName} · {[p.city, p.state].filter(Boolean).join("/")} · {dateTime(p.createdAt)}
                    </p>
                  </div>
                  <ProducerBadge status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
