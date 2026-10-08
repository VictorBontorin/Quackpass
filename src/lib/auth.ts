import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { COOKIES, MAX_AGE, signSession, verifySession, type Role } from "./session";

export async function createSession(role: Role, id: string) {
  cookies().set(COOKIES[role], await signSession(role, id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE[role],
  });
}

export function destroySession(role: Role) {
  cookies().delete(COOKIES[role]);
}

export function sessionId(role: Role): Promise<string | null> {
  return verifySession(cookies().get(COOKIES[role])?.value, role);
}

// ---------- Produtor ----------

export function currentProducerId() {
  return sessionId("producer");
}

/** Produtor logado, em qualquer situação (pendente, aprovado...). */
export async function requireProducerSession() {
  const id = await currentProducerId();
  const producer = id ? await db.producer.findUnique({ where: { id } }) : null;
  if (!producer || producer.status === "BLOCKED") redirect("/produtor/login");
  return producer;
}

/** Produtor logado E aprovado. Quem ainda não foi aprovado vai para a tela de análise. */
export async function requireProducer() {
  const producer = await requireProducerSession();
  if (producer.status !== "APPROVED") redirect("/produtor/aguardando");
  return producer;
}

/** Garante que o evento pertence ao produtor logado. */
export async function requireOwnedEvent(eventId: string) {
  const producer = await requireProducer();
  const event = await db.event.findFirst({ where: { id: eventId, producerId: producer.id } });
  if (!event) redirect("/painel");
  return { producer, event };
}

// ---------- Portaria ----------

export async function currentStaff() {
  const id = await sessionId("staff");
  if (!id) return null;
  const staff = await db.staffMember.findUnique({ where: { id }, include: { producer: true } });
  if (!staff || !staff.active || staff.producer.status !== "APPROVED") return null;
  return staff;
}

export async function requireStaff() {
  const staff = await currentStaff();
  if (!staff) redirect("/portaria");
  return staff;
}

// ---------- Administração ----------

export async function requireAdmin() {
  const id = await sessionId("admin");
  const admin = id ? await db.adminUser.findUnique({ where: { id } }) : null;
  if (!admin) redirect("/admin/entrar");
  return admin;
}
