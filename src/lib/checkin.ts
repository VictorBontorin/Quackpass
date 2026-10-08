import { currentProducerId, currentStaff } from "./auth";
import { db } from "./db";

/** Quem está operando a portaria: o próprio produtor ou um membro da equipe dele. */
export async function checkinActor(eventId: string): Promise<{ eventId: string; name: string } | null> {
  const staff = await currentStaff();
  const producerId = staff?.producerId ?? (await currentProducerId());
  if (!producerId) return null;
  const event = await db.event.findFirst({
    where: { id: eventId, producerId, producer: { status: "APPROVED" } },
    select: { id: true, producer: { select: { name: true } } },
  });
  if (!event) return null;
  return { eventId: event.id, name: staff ? staff.name : `${event.producer.name} (produtor)` };
}

/** CPF parcialmente escondido: ***.456.789-** (LGPD: a portaria só precisa conferir). */
export function maskDocument(doc: string): string {
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
  if (d.length === 14) return `**.${d.slice(2, 5)}.${d.slice(5, 8)}/****-**`;
  return "***";
}
