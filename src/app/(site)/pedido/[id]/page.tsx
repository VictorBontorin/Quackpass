import { accentVars } from "@/lib/content";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MailIcon } from "@/components/Icons";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { brl, dateTime } from "@/lib/format";
import { selfRefundStatus } from "@/lib/orders";
import { refundPolicyText } from "@/lib/policy";
import { formatTicketCode, qrDataUrl } from "@/lib/tickets";
import { OrderActions } from "./OrderActions";
import { PixPanel, StatusPoller } from "./PixPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seu pedido", robots: { index: false } };

export default async function OrderPage({ params }: { params: { id: string } }) {
  const order = await db.order.findUnique({
    where: { id: params.id },
    include: {
      event: true,
      items: { include: { batch: { include: { ticketType: true } } } },
      tickets: { include: { batch: { include: { ticketType: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  const tickets = await Promise.all(order.tickets.map(async (t) => ({ ...t, qr: await qrDataUrl(t.code) })));
  const pixImage = order.pixQrCodeUrl ?? (order.pixQrCode ? await qrDataUrl(order.pixQrCode) : null);
  const used = tickets.filter((t) => t.status === "USED").length;
  const refund = selfRefundStatus(order, used);
  const ev = order.event;

  return (
    <div className="container-page max-w-2xl space-y-6 py-10" style={accentVars(ev.accentColor)}>
      <div>
        <p className="text-xs text-slate-500">Pedido {order.id}</p>
        <h1 className="text-2xl font-extrabold">{ev.title}</h1>
        <p className="text-sm text-slate-600">
          {dateTime(ev.startsAt)} · {ev.venueName}, {ev.city}/{ev.state}
        </p>
      </div>

      {order.status === "PENDING" && order.paymentMethod === "PIX" && (
        <PixPanel
          orderId={order.id}
          qrImage={pixImage}
          copyPaste={order.pixQrCode}
          expiresAt={order.expiresAt.toISOString()}
          totalLabel={brl(order.totalCents)}
          canSimulate={env.paymentProvider === "mock"}
        />
      )}

      {order.status === "PENDING" && order.paymentMethod !== "PIX" && (
        <div className="card space-y-3">
          <p className="font-semibold">Aguardando a confirmação do pagamento...</p>
          {order.authUrl && (
            <a href={order.authUrl} className="btn-accent">
              Confirmar no meu banco
            </a>
          )}
          <StatusPoller orderId={order.id} />
        </div>
      )}

      {(order.status === "FAILED" || order.status === "EXPIRED" || order.status === "CANCELLED") && (
        <div className="card space-y-3 border-red-200">
          <p className="font-semibold text-red-800">
            {order.status === "EXPIRED" ? "O tempo para pagamento acabou e os ingressos foram liberados." : "O pagamento não foi aprovado."}
          </p>
          {order.failureReason && <p className="text-sm text-slate-600">{order.failureReason}</p>}
          <Link href={`/evento/${ev.slug}`} className="btn-accent">
            Tentar novamente
          </Link>
        </div>
      )}

      {order.status === "REFUNDED" && (
        <div className="card border-slate-300 bg-slate-100">
          <p className="font-semibold">Pedido reembolsado</p>
          <p className="text-sm text-slate-600">
            O valor de {brl(order.totalCents)} foi devolvido{order.refundedAt ? ` em ${dateTime(order.refundedAt)}` : ""} e os ingressos foram cancelados.
          </p>
        </div>
      )}

      {order.status === "PAID" && (
        <div className="space-y-4">
          <div className="card border-emerald-200 bg-emerald-50">
            <p className="font-semibold text-emerald-800">Pagamento confirmado!</p>
            <p className="text-sm text-emerald-900">
              <MailIcon className="mr-1 inline h-4 w-4 align-[-3px]" />
              Enviamos os ingressos para <b className="break-all">{order.buyerEmail}</b>. Confira também a caixa de spam.
            </p>
          </div>
          {tickets.map((t, i) => (
            <div key={t.id} className="card flex flex-col items-center gap-4 sm:flex-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.qr} alt="QR Code do ingresso" className={`h-44 w-44 rounded-lg border border-slate-200 p-2 ${t.status !== "VALID" ? "opacity-40" : ""}`} />
              <div className="flex-1 space-y-1 text-center sm:text-left">
                <p className="text-xs uppercase text-slate-500">
                  Ingresso {i + 1} de {tickets.length}
                </p>
                <p className="text-lg font-bold">
                  {t.batch.ticketType.name} · {t.batch.name}
                </p>
                <p className="text-sm text-slate-700">{t.holderName}</p>
                <p className="font-mono text-sm tracking-widest text-[var(--accent-ink)]">{formatTicketCode(t.code)}</p>
                {t.status === "USED" && <span className="badge bg-slate-100 text-slate-700">Utilizado</span>}
                <Link href={`/ingresso/${t.code}`} className="block text-xs text-slate-500 underline">
                  Abrir só este ingresso (para enviar a um amigo)
                </Link>
              </div>
            </div>
          ))}
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Evento para maiores de {ev.minAge} anos: leve documento oficial com foto. Cada QR Code vale uma entrada.
          </p>
        </div>
      )}

      <div className="card space-y-1 text-sm">
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between">
            <span>
              {i.quantity}x {i.batch.ticketType.name} - {i.batch.name}
            </span>
            <span>{brl(i.unitPriceCents * i.quantity)}</span>
          </div>
        ))}
        {order.discountCents > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Desconto</span>
            <span>- {brl(order.discountCents)}</span>
          </div>
        )}
        {ev.feePayer === "BUYER" && order.feeCents > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Taxa de serviço</span>
            <span>{brl(order.feeCents)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-slate-100 pt-2 font-bold">
          <span>Total</span>
          <span>{brl(order.totalCents)}</span>
        </div>
      </div>

      {order.status === "PAID" && (
        <div className="card space-y-3">
          <h2 className="font-bold">Precisa de ajuda?</h2>
          <p className="text-sm text-slate-600">{refundPolicyText(ev)}</p>
          {ev.refundMode === "PRODUCER" && (ev.contactPhone || ev.contactEmail) && (
            <p className="text-sm text-slate-600">
              Contato do organizador: {[ev.contactPhone, ev.contactEmail].filter(Boolean).join(" · ")}
            </p>
          )}
          <OrderActions
            orderId={order.id}
            canRefund={refund.allowed}
            refundBlockedReason={ev.refundMode === "SELF_SERVICE" && !refund.allowed ? refund.reason : undefined}
            refundDeadline={ev.refundMode === "SELF_SERVICE" ? dateTime(refund.deadline) : undefined}
            totalLabel={brl(order.totalCents)}
          />
        </div>
      )}
    </div>
  );
}
