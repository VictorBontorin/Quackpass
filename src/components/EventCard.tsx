import Link from "next/link";
import { brl, dateTime } from "@/lib/format";

export function EventCard({
  event,
  fromCents,
}: {
  event: { slug: string; title: string; venueName: string; city: string; state: string; startsAt: Date; bannerUrl: string | null };
  fromCents: number | null;
}) {
  return (
    <Link
      href={`/evento/${event.slug}`}
      className="group overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 transition hover:border-brand-400"
    >
      <div className="aspect-[16/9] w-full bg-gradient-to-br from-brand-600/40 via-fuchsia-900/40 to-neutral-900">
        {event.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.bannerUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
      </div>
      <div className="space-y-1 p-4">
        <p className="text-xs font-semibold uppercase text-brand-400">{dateTime(event.startsAt)}</p>
        <h3 className="line-clamp-2 font-bold group-hover:text-brand-400">{event.title}</h3>
        <p className="text-sm text-neutral-400">
          {event.venueName} · {event.city}/{event.state}
        </p>
        {fromCents != null && <p className="pt-1 text-sm">A partir de {fromCents === 0 ? "Grátis" : brl(fromCents)}</p>}
      </div>
    </Link>
  );
}
