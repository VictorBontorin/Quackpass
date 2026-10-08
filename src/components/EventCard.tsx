import Link from "next/link";
import { brl, dateTime } from "@/lib/format";

export function EventCard({
  event,
  fromCents,
}: {
  event: { slug: string; title: string; venueName: string; city: string; state: string; startsAt: Date; bannerUrl: string | null; accentColor: string };
  fromCents: number | null;
}) {
  return (
    <Link href={`/evento/${event.slug}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="aspect-[16/9] w-full" style={{ background: event.accentColor }}>
        {event.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.bannerUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
      </div>
      <div className="space-y-1 p-4">
        <p className="text-xs font-semibold uppercase text-brand-700">{dateTime(event.startsAt)}</p>
        <h3 className="line-clamp-2 font-bold text-slate-900 group-hover:text-brand-700">{event.title}</h3>
        <p className="text-sm text-slate-500">
          {event.venueName} · {event.city}/{event.state}
        </p>
        {fromCents != null && (
          <p className="pt-1 text-sm text-slate-700">
            A partir de <b>{fromCents === 0 ? "Grátis" : brl(fromCents)}</b>
          </p>
        )}
      </div>
    </Link>
  );
}
