import { requireOwnedEvent } from "@/lib/auth";
import { db } from "@/lib/db";
import { Scanner } from "@/components/checkin/Scanner";

export default async function CheckinPage({ params }: { params: { id: string } }) {
  const { event } = await requireOwnedEvent(params.id);
  const [used, total] = await Promise.all([
    db.ticket.count({ where: { eventId: event.id, status: "USED" } }),
    db.ticket.count({ where: { eventId: event.id, status: { not: "CANCELLED" } } }),
  ]);
  return <Scanner eventId={event.id} initialUsed={used} total={total} />;
}
