import { requireOwnedEvent } from "@/lib/auth";
import { updateEvent } from "@/app/painel/actions";
import { EventForm } from "@/app/painel/EventForm";

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const { event } = await requireOwnedEvent(params.id);
  return (
    <div className="max-w-2xl">
      <EventForm action={updateEvent.bind(null, event.id)} event={event} submitLabel="Salvar alterações" />
    </div>
  );
}
