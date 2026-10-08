import { EventCard } from "@/components/EventCard";
import { db } from "@/lib/db";
import { currentBatch } from "@/lib/pricing";

// Cache curto: a home aguenta pico de tráfego sem bater no banco a cada acesso
export const revalidate = 30;

export default async function Home({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim();
  const events = await db.event.findMany({
    where: {
      status: "PUBLISHED",
      startsAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { startsAt: "asc" },
    take: 60,
    include: { ticketTypes: { where: { active: true }, include: { batches: true } } },
  });

  return (
    <div className="container-page py-10">
      <section className="mb-10 space-y-4">
        <h1 className="text-3xl font-black sm:text-5xl">
          Seu rolê começa <span className="text-brand-400">aqui</span>.
        </h1>
        <p className="max-w-xl text-neutral-400">Ingressos para baladas, bares e eventos. Pague com Pix ou cartão e receba na hora.</p>
        <form className="flex max-w-md gap-2">
          <input name="q" defaultValue={q} placeholder="Buscar evento ou cidade" className="input" />
          <button className="btn-primary">Buscar</button>
        </form>
      </section>

      {events.length === 0 ? (
        <p className="text-neutral-400">Nenhum evento encontrado.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => {
            const prices = e.ticketTypes
              .map((t) => currentBatch(t.batches))
              .filter((b) => b != null)
              .map((b) => Math.min(b!.priceCents, b!.halfPriceCents ?? Infinity));
            return <EventCard key={e.id} event={e} fromCents={prices.length ? Math.min(...prices) : null} />;
          })}
        </div>
      )}
    </div>
  );
}
