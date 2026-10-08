import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { dateTime } from "@/lib/format";
import { currentBatch } from "@/lib/pricing";
import { Checkout, type CheckoutTicketType } from "./Checkout";

// ISR: a página é servida do cache e regerada a cada 15s. O estoque real é
// sempre conferido no checkout, então o cache nunca causa venda a mais.
export const revalidate = 15;

// Nenhuma página gerada no build: cada evento é gerado no 1º acesso e depois servido do cache
export async function generateStaticParams() {
  return [];
}

async function getEvent(slug: string) {
  return db.event.findUnique({
    where: { slug },
    include: {
      producer: { select: { name: true } },
      ticketTypes: { where: { active: true }, orderBy: { sortOrder: "asc" }, include: { batches: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const event = await getEvent(params.slug);
  if (!event) return {};
  return {
    title: event.title,
    description: `${event.venueName} · ${event.city}/${event.state}`,
    openGraph: { title: event.title, images: event.bannerUrl ? [event.bannerUrl] : [] },
  };
}

export default async function EventPage({ params }: { params: { slug: string } }) {
  const event = await getEvent(params.slug);
  if (!event || event.status === "DRAFT") notFound();

  const ticketTypes: CheckoutTicketType[] = event.ticketTypes.map((t) => {
    const b = currentBatch(t.batches);
    const allSoldOut = t.batches.every((x) => x.sold >= x.quantity);
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      soldOut: allSoldOut,
      batch: b && {
        id: b.id,
        name: b.name,
        priceCents: b.priceCents,
        halfPriceCents: b.halfPriceCents,
        maxPerOrder: Math.min(b.maxPerOrder, b.quantity - b.sold),
      },
    };
  });

  const ended = (event.endsAt ?? event.startsAt) < new Date();
  const salesOpen = event.status === "PUBLISHED" && !ended;

  return (
    <div>
      <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-brand-600/40 via-fuchsia-900/40 to-neutral-950 sm:h-80">
        {event.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.bannerUrl} alt="" className="h-full w-full object-cover opacity-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent" />
      </div>

      <div className="container-page -mt-20 grid gap-8 pb-16 lg:grid-cols-[1fr_420px]">
        <div className="relative space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase text-brand-400">{dateTime(event.startsAt)}</p>
            <h1 className="text-3xl font-black sm:text-4xl">{event.title}</h1>
            <p className="text-neutral-300">
              {event.venueName} · {event.address} · {event.city}/{event.state}
            </p>
            <p className="text-sm text-neutral-500">
              Produzido por {event.producer.name}
              {event.minAge ? ` · Proibido para menores de ${event.minAge} anos` : ""}
            </p>
          </div>
          {event.status === "CANCELLED" && (
            <div className="card border-red-900 text-red-200">Este evento foi cancelado.</div>
          )}
          {event.description && (
            <div className="card whitespace-pre-line text-neutral-300">{event.description}</div>
          )}
        </div>

        <div className="relative">
          <div className="lg:sticky lg:top-20">
            {salesOpen ? (
              <Suspense fallback={<div className="card">Carregando...</div>}>
                <Checkout
                  eventId={event.id}
                  ticketTypes={ticketTypes}
                  feePayer={event.feePayer}
                  fee={{ percent: env.platformFeePercent, minCents: env.platformFeeMinCents }}
                  provider={env.paymentProvider}
                  pagarmePublicKey={process.env.PAGARME_PUBLIC_KEY ?? ""}
                />
              </Suspense>
            ) : (
              <div className="card text-neutral-400">{ended ? "Vendas encerradas." : "Vendas indisponíveis."}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
