import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { brl, dateTime } from "@/lib/format";
import { StatusBadge } from "@/app/painel/StatusBadge";
import { adminRefundOrder } from "../../actions";
import { RefundButton } from "./RefundButton";

/** Busca de pedidos em toda a plataforma (atendimento ao comprador). */
export default async function AdminOrders({ searchParams }: { searchParams: { q?: string; falha?: string } }) {
  const q = searchParams.q?.trim() ?? "";
  const digits = q.replace(/\D/g, "");
  const failures = searchParams.falha === "1";
  const where: Prisma.OrderWhereInput | null = failures
    ? { status: "PAID", refundError: { not: null } }
    : q
      ? {
          OR: [
            { id: q },
            { buyerEmail: { contains: q.toLowerCase() } },
            { buyerName: { contains: q, mode: "insensitive" } },
            ...(digits.length >= 6 ? [{ buyerDocument: { contains: digits } }] : []),
          ],
        }
      : null;
  const orders = where
    ? await db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { event: { select: { title: true, producer: { select: { id: true, name: true } } } } } })
    : [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Pedidos</h1>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="E-mail, CPF, nome ou nº do pedido" className="input w-80 py-2" />
        <button className="btn-primary py-2">Buscar</button>
        <Link href="/admin/pedidos?falha=1" className="btn-secondary py-2">
          Reembolsos com falha
        </Link>
      </form>
      {!where && <p className="text-sm text-slate-500">Busque pelo e-mail, CPF ou nome do comprador para atender uma reclamação.</p>}
      {where && (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Comprador</th>
                <th>Evento</th>
                <th>Status</th>
                <th className="text-right">Total</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap text-slate-500">{dateTime(o.createdAt)}</td>
                  <td>
                    <a href={`${env.appUrl}/pedido/${o.id}`} target="_blank" className="font-medium hover:text-brand-700">
                      {o.buyerName}
                    </a>
                    <p className="text-xs text-slate-500">
                      {o.buyerEmail} · {o.paymentMethod}
                    </p>
                  </td>
                  <td>
                    <p>{o.event.title}</p>
                    <Link href={`/admin/produtores/${o.event.producer.id}`} className="text-xs text-slate-500 hover:text-brand-700">
                      {o.event.producer.name}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={o.status} />
                    {o.refundError && <p className="mt-1 max-w-[220px] text-xs text-red-700">Falha no reembolso: {o.refundError}</p>}
                  </td>
                  <td className="text-right">{brl(o.totalCents)}</td>
                  <td>
                    {o.status === "PAID" && (
                      <RefundButton action={adminRefundOrder.bind(null, o.id)} confirm={`Reembolsar ${brl(o.totalCents)} para ${o.buyerName}? Os ingressos serão cancelados.`} />
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-slate-500">
                    Nenhum pedido encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
