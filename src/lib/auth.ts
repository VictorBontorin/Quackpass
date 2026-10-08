import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

export const SESSION_COOKIE = "qp_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET precisa ter pelo menos 32 caracteres");
  return new TextEncoder().encode(s);
}

export async function createSession(producerId: string) {
  const token = await new SignJWT({ sub: producerId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function destroySession() {
  cookies().delete(SESSION_COOKIE);
}

export async function verifySessionToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function currentProducerId(): Promise<string | null> {
  return verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
}

/** Para páginas e actions do painel: retorna o produtor logado ou manda para o login. */
export async function requireProducer() {
  const id = await currentProducerId();
  const producer = id ? await db.producer.findUnique({ where: { id } }) : null;
  if (!producer) redirect("/produtor/login");
  return producer;
}

/** Garante que o evento pertence ao produtor logado. */
export async function requireOwnedEvent(eventId: string) {
  const producer = await requireProducer();
  const event = await db.event.findFirst({ where: { id: eventId, producerId: producer.id } });
  if (!event) redirect("/painel");
  return { producer, event };
}
