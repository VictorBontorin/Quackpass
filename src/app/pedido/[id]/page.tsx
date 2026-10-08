import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { brl, dateTime } from "@/lib/format";
import { formatTicketCode, qrDataUrl } from "@/lib/tickets";
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

  const tickets = await Promise.all(
    order.tickets.map(async (t) => ({ ...t, qr: await qrDataUrl(t.code) })),
  );
  const pixImage = order.pixQrCodeUrl ?? (order.pixQrCode ? await qrDataUrl(order.pixQrCode) : null);

  return (
    <div className="container-page max-w-2xl space-y-6 py-10">
      <div>
        <p className="text-xs uppercase text-neutral-500">Pedido {order.id}</p>
        <h1 className="text-2xl font-black">{order.event.title}</h1>
        <p className="text-sm text-neutral-400">
          {dateTime(order.event.startsAt)} · {order.event.venueName}
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
        <div className="card space-y-2">
          <p className="font-semibold">Aguardando confirmação do pagamento...</p>
          {order.authUrl && (
            <a href={order.authUrl} className="btn-primary">
              Confirmar no meu banco
            </a>
          )}
          <StatusPoller orderId={order.id} />
        </div>
      )}

      {(order.status === "FAILED" || order.status === "EXPIRED" || order.status === "CANCELLED") && (
        <div className="card space-y-3 border-red-900">
          <p className="font-semibold text-red-300">
            {order.status === "EXPIRED" ? "O tempo para pagamento acabou." : "O pagamento não foi aprovado."}
          </p>
          {order.failureReason && <p className="text-sm text-neutral-400">{order.failureReason}</p>}
          <Link href={`/evento/${order.event.slug}`} className="btn-primary">
            Tentar novamente
          </Link>
        </div>
      )}

      {order.status === "REFUNDED" && <div className="card">Este pedido foi estornado e os ingressos foram cancelados.</div>}

      {order.status === "PAID" && (
        <div className="space-y-4">
          <div className="card border-emerald-900 bg-emerald-950/40">
            <p className="font-semibold text-emerald-300">Pagamento confirmado! 🎉</p>
            <p className="text-sm text-neutral-300">
              Apresente o QR Code de cada ingresso na entrada. Salve esta página ou tire um print.
            </p>
          </div>
          {tickets.map((t, i) => (
            <div key={t.id} className="card flex flex-col items-center gap-4 sm:flex-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.qr} alt="QR Code do ingresso" className="h-44 w-44 rounded-lg bg-white p-2" />
              <div className="flex-1 space-y-1 text-center sm:text-left">
                <p className="text-xs uppercase text-neutral-500">
                  Ingresso {i + 1} de {tickets.length}
                </p>
                <p className="text-lg font-bold">
                  {t.batch.ticketType.name} · {t.batch.name}
                  {t.half && " (meia)"}
                </p>
                <p className="text-sm text-neutral-300">{t.holderName}</p>
                <p className="font-mono text-sm tracking-widest text-brand-400">{formatTicketCode(t.code)}</p>
                {t.status === "USED" && <span className="badge bg-neutral-800 text-neutral-300">Utilizado</span>}
                {t.status === "CANCELLED" && <span className="badge bg-red-950 text-red-300">Cancelado</span>}
                <Link href={`/ingresso/${t.code}`} className="block text-xs text-neutral-400 underline">
                  Abrir só este ingresso (para enviar a um amigo)
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card space-y-1 text-sm">
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between">
            <span>
              {i.quantity}x {i.batch.ticketType.name} - {i.batch.name}
              {i.half && " (meia)"}
            </span>
            <span>{brl(i.unitPriceCents * i.quantity)}</span>
          </div>
        ))}
        {order.discountCents > 0 && (
          <div className="flex justify-between text-emerald-400">
            <span>Desconto</span>
            <span>- {brl(order.discountCents)}</span>
          </div>
        )}
        {order.event.feePayer === "BUYER" && order.feeCents > 0 && (
          <div className="flex justify-between">
            <span>Taxa de serviço</span>
            <span>{brl(order.feeCents)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 font-bold">
          <span>Total</span>
          <span>{brl(order.totalCents)}</span>
        </div>
      </div>
    </div>
  );
}
