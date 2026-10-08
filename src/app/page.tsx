import { EventCard } from "@/components/EventCard";
import { MailIcon, ShieldIcon } from "@/components/Icons";
import { db } from "@/lib/db";
import { currentBatch } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim();
  const events = await db.event.findMany({
    where: {
      status: "PUBLISHED",
      startsAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }, { venueName: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { startsAt: "asc" },
    take: 60,
    include: { ticketTypes: { where: { active: true }, include: { batches: true } } },
  });

  return (
    <div>
      <section className="border-b border-slate-200 bg-white">
        <div className="container-page grid gap-8 py-12 sm:py-16 lg:grid-cols-2 lg:items-center">
          <div className="space-y-5">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Ingressos para os melhores <span className="text-brand-600">rolês</span> da cidade
            </h1>
            <p className="max-w-lg text-lg text-slate-600">Baladas, bares e festas. Pague com Pix ou cartão e receba o ingresso no e-mail na hora.</p>
            <form className="flex max-w-lg gap-2" action="/">
              <input name="q" defaultValue={q} placeholder="Buscar por evento, casa ou cidade" className="input py-3" aria-label="Buscar eventos" />
              <button className="btn-primary px-6">Buscar</button>
            </form>
          </div>
          <ul className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-1">
            {[
              [<ShieldIcon key="s" className="h-6 w-6 text-emerald-600" />, "Compra segura", "Pagamento processado por instituição autorizada pelo Banco Central."],
              [<MailIcon key="m" className="h-6 w-6 text-brand-600" />, "Ingresso na hora", "QR Code enviado para o seu e-mail assim que o pagamento é confirmado."],
              [<span key="p" className="grid h-6 w-6 place-items-center rounded bg-brand-50 text-xs font-bold text-brand-700">PIX</span>, "Pix, crédito e débito", "Parcele no cartão em até 6x sem juros."],
            ].map(([icon, title, text], i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {icon}
                <div>
                  <p className="font-semibold text-slate-900">{title}</p>
                  <p className="text-slate-600">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page py-10">
        <h2 className="mb-5 text-2xl font-bold">{q ? `Resultados para "${q}"` : "Próximos eventos"}</h2>
        {events.length === 0 ? (
          <p className="card text-slate-600">Nenhum evento encontrado.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => {
              const prices = e.ticketTypes.map((t) => currentBatch(t.batches)?.priceCents).filter((p): p is number => p != null);
              return <EventCard key={e.id} event={e} fromCents={prices.length ? Math.min(...prices) : null} />;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
