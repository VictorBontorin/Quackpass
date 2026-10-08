import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";
import { requireOwnedEvent } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { brl, dateTime } from "@/lib/format";
import { refundOrderAction, resendTicketsAction } from "@/app/painel/actions";
import { StatusBadge } from "@/app/painel/StatusBadge";
import { OrderRowActions } from "./OrderRowActions";

const PAGE = 50;
const REFUND_LABEL: Record<string, string> = {
  BUYER: "Reembolsado pelo cliente",
  PRODUCER: "Reembolsado por você",
  ADMIN: "Reembolsado pela plataforma",
  CANCELLATION: "Evento cancelado",
};
const statuses: OrderStatus[] = ["PAID", "PENDING", "FAILED", "EXPIRED", "REFUNDING", "REFUNDED"];

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { status?: string; q?: string; p?: string };
}) {
  const { event } = await requireOwnedEvent(params.id);
  const status = statuses.includes(searchParams.status as OrderStatus) ? (searchParams.status as OrderStatus) : undefined;
  const q = searchParams.q?.trim();
  const page = Math.max(1, Number(searchParams.p) || 1);

  const where: Prisma.OrderWhereInput = {
    eventId: event.id,
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { buyerEmail: { contains: q, mode: "insensitive" } },
            { buyerName: { contains: q, mode: "insensitive" } },
            { buyerDocument: { contains: q.replace(/\D/g, "") || q } },
            { id: q },
          ],
        }
      : {}),
  };
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE,
      skip: (page - 1) * PAGE,
      include: { coupon: true, advertiser: true, _count: { select: { tickets: true } } },
    }),
    db.order.count({ where }),
  ]);
  const qs = (p: number) => `?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), p: String(p) })}`;

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Nome, e-mail, CPF ou nº do pedido" className="input max-w-xs" />
        <select name="status" defaultValue={status ?? ""} className="input w-40">
          <option value="">Todos</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="btn-secondary">Filtrar</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Comprador</th>
              <th>Status</th>
              <th>Forma</th>
              <th>Cupom</th>
              <th className="text-right">Ingressos</th>
              <th className="text-right">Total</th>
              <th className="text-right">Você recebe</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="whitespace-nowrap text-slate-500">{dateTime(o.createdAt)}</td>
                <td>
                  <a href={`${env.appUrl}/pedido/${o.id}`} target="_blank" className="font-medium hover:text-brand-600">
                    {o.buyerName}
                  </a>
                  <p className="text-xs text-slate-500">{o.buyerEmail}</p>
                </td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
                <td className="text-xs">{o.paymentMethod}</td>
                <td className="text-xs">
                  {o.coupon?.code ?? "-"}
                  {o.advertiser && <p className="text-slate-500">{o.advertiser.name}</p>}
                </td>
                <td className="text-right">{o._count.tickets}</td>
                <td className="text-right">{brl(o.totalCents)}</td>
                <td className="text-right">
                  {brl(o.producerCents)}
                  {o.commissionCents > 0 && <p className="text-xs text-slate-500">comissão {brl(o.commissionCents)}</p>}
                </td>
                <td className="text-right">
                  {o.status === "PAID" ? (
                    <OrderRowActions
                      refund={refundOrderAction.bind(null, event.id, o.id)}
                      resend={resendTicketsAction.bind(null, event.id, o.id)}
                      buyer={o.buyerName}
                      total={brl(o.totalCents)}
                    />
                  ) : o.status === "REFUNDED" ? (
                    <span className="text-xs text-slate-500">{REFUND_LABEL[o.refundedBy ?? ""] ?? "Estornado"}</span>
                  ) : null}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-slate-500">
                  Nenhum pedido
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{total} pedidos</span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={qs(page - 1)} className="btn-secondary">
              ← Anterior
            </Link>
          )}
          {page * PAGE < total && (
            <Link href={qs(page + 1)} className="btn-secondary">
              Próxima →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
