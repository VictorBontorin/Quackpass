import { Stat } from "@/components/Stat";
import { requireOwnedEvent } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { brl } from "@/lib/format";
import { setEventStatus } from "@/app/painel/actions";

const methodLabel: Record<string, string> = { PIX: "Pix", CREDIT_CARD: "Crédito", DEBIT_CARD: "Débito", FREE: "Gratuito" };

export default async function EventSummary({ params }: { params: { id: string } }) {
  const { event } = await requireOwnedEvent(params.id);

  const [paid, pending, byMethod, byAdvertiser, byCoupon, ticketsByBatch, checkins, types, advertisers, coupons] = await Promise.all([
    db.order.aggregate({ where: { eventId: event.id, status: "PAID" }, _sum: { totalCents: true, producerCents: true, discountCents: true }, _count: true }),
    db.order.count({ where: { eventId: event.id, status: "PENDING" } }),
    db.order.groupBy({ by: ["paymentMethod"], where: { eventId: event.id, status: "PAID" }, _sum: { totalCents: true }, _count: true }),
    db.order.groupBy({ by: ["advertiserId"], where: { eventId: event.id, status: "PAID" }, _sum: { producerCents: true }, _count: true }),
    db.order.groupBy({ by: ["couponId"], where: { eventId: event.id, status: "PAID", couponId: { not: null } }, _sum: { discountCents: true }, _count: true }),
    db.ticket.groupBy({ by: ["batchId", "half"], where: { eventId: event.id, status: { not: "CANCELLED" } }, _count: true }),
    db.ticket.count({ where: { eventId: event.id, status: "USED" } }),
    db.ticketType.findMany({ where: { eventId: event.id }, orderBy: { sortOrder: "asc" }, include: { batches: { orderBy: { sortOrder: "asc" } } } }),
    db.advertiser.findMany({ where: { producerId: event.producerId } }),
    db.coupon.findMany({ where: { eventId: event.id } }),
  ]);

  const ticketsTotal = ticketsByBatch.reduce((s, t) => s + t._count, 0);
  const issued = (batchId: string, half: boolean) => ticketsByBatch.find((t) => t.batchId === batchId && t.half === half)?._count ?? 0;

  const advRows = await db.$queryRaw<{ advertiserId: string; n: number }[]>`
    SELECT o."advertiserId", COUNT(t."id")::int AS n
    FROM "Ticket" t JOIN "Order" o ON o."id" = t."orderId"
    WHERE t."eventId" = ${event.id} AND t."status" <> 'CANCELLED' AND o."advertiserId" IS NOT NULL
    GROUP BY o."advertiserId"`;
  const ticketsPerAdvertiser = new Map(advRows.map((r) => [r.advertiserId, r.n]));

  const publish = setEventStatus.bind(null, event.id, "PUBLISHED");
  const unpublish = setEventStatus.bind(null, event.id, "DRAFT");
  const cancel = setEventStatus.bind(null, event.id, "CANCELLED");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {event.status !== "PUBLISHED" && event.status !== "CANCELLED" && (
          <form action={publish}>
            <button className="btn-primary">Publicar e abrir vendas</button>
          </form>
        )}
        {event.status === "PUBLISHED" && (
          <form action={unpublish}>
            <button className="btn-secondary">Pausar vendas</button>
          </form>
        )}
        {event.status !== "CANCELLED" && (
          <form action={cancel}>
            <button className="btn-danger">Cancelar evento</button>
          </form>
        )}
        <code className="ml-auto rounded-lg bg-neutral-900 px-3 py-2 text-xs text-neutral-400">
          {env.appUrl}/evento/{event.slug}
        </code>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Você recebe" value={brl(paid._sum.producerCents ?? 0)} hint={`${paid._count} pedidos pagos`} />
        <Stat label="Vendido (bruto)" value={brl(paid._sum.totalCents ?? 0)} hint={`Descontos: ${brl(paid._sum.discountCents ?? 0)}`} />
        <Stat label="Ingressos" value={String(ticketsTotal)} hint={`${pending} pedidos aguardando pagamento`} />
        <Stat label="Check-ins" value={`${checkins} / ${ticketsTotal}`} hint={ticketsTotal ? `${Math.round((checkins / ticketsTotal) * 100)}% entraram` : undefined} />
      </div>

      <section className="card overflow-x-auto p-0">
        <h2 className="p-4 pb-2 font-bold">Vendas por ingresso e lote</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Ingresso</th>
              <th>Lote</th>
              <th className="text-right">Preço</th>
              <th className="text-right">Inteira</th>
              <th className="text-right">Meia</th>
              <th className="text-right">Ocupação</th>
            </tr>
          </thead>
          <tbody>
            {types.flatMap((t) =>
              t.batches.map((b) => (
                <tr key={b.id}>
                  <td>{t.name}</td>
                  <td>{b.name}</td>
                  <td className="text-right">{brl(b.priceCents)}</td>
                  <td className="text-right">{issued(b.id, false)}</td>
                  <td className="text-right">{issued(b.id, true)}</td>
                  <td className="text-right">
                    {b.sold}/{b.quantity}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card overflow-x-auto p-0">
          <h2 className="p-4 pb-2 font-bold">Vendas por anunciante</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Anunciante</th>
                <th className="text-right">Pedidos</th>
                <th className="text-right">Ingressos</th>
                <th className="text-right">Você recebe</th>
              </tr>
            </thead>
            <tbody>
              {byAdvertiser
                .sort((a, b) => (b._sum.producerCents ?? 0) - (a._sum.producerCents ?? 0))
                .map((r) => (
                  <tr key={r.advertiserId ?? "none"}>
                    <td>{r.advertiserId ? advertisers.find((a) => a.id === r.advertiserId)?.name : <span className="text-neutral-500">Venda direta</span>}</td>
                    <td className="text-right">{r._count}</td>
                    <td className="text-right">{r.advertiserId ? ticketsPerAdvertiser.get(r.advertiserId) ?? 0 : "-"}</td>
                    <td className="text-right">{brl(r._sum.producerCents ?? 0)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {byCoupon.length > 0 && (
            <p className="p-4 text-xs text-neutral-500">
              Cupons usados:{" "}
              {byCoupon.map((c) => `${coupons.find((x) => x.id === c.couponId)?.code} (${c._count})`).join(", ")}
            </p>
          )}
        </section>

        <section className="card overflow-x-auto p-0">
          <h2 className="p-4 pb-2 font-bold">Por forma de pagamento</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Forma</th>
                <th className="text-right">Pedidos</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {byMethod.map((m) => (
                <tr key={m.paymentMethod}>
                  <td>{methodLabel[m.paymentMethod]}</td>
                  <td className="text-right">{m._count}</td>
                  <td className="text-right">{brl(m._sum.totalCents ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
