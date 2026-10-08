import { createEvent } from "../../actions";
import { EventForm } from "../../EventForm";

export default function NewEventPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-black">Novo evento</h1>
      <EventForm action={createEvent} submitLabel="Criar evento e adicionar ingressos" />
    </div>
  );
}
