import Link from "next/link";
import { requireOwnedEvent } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { StatusBadge } from "../../StatusBadge";
import { Tabs } from "./Tabs";

export default async function EventLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const { event } = await requireOwnedEvent(params.id);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/painel" className="text-xs text-slate-500 hover:text-slate-900">
            ← Eventos
          </Link>
          <h1 className="text-2xl font-black">{event.title}</h1>
          <p className="text-sm text-slate-500">
            {dateTime(event.startsAt)} · {event.venueName} · <StatusBadge status={event.status} />
          </p>
        </div>
        <Link href={event.status === "DRAFT" ? `/previa/${event.id}` : `/evento/${event.slug}`} target="_blank" className="btn-secondary">
          {event.status === "DRAFT" ? "Pré-visualizar página ↗" : "Ver página pública ↗"}
        </Link>
      </div>
      <Tabs base={`/painel/eventos/${event.id}`} />
      {children}
    </div>
  );
}
