import { jwtVerify, SignJWT } from "jose";

/**
 * Sessões assinadas (JWT em cookie httpOnly). Cada área tem o seu cookie e o seu papel,
 * então o login de uma área nunca vale em outra. Este arquivo roda também no middleware (edge).
 */
export type Role = "producer" | "staff" | "admin";

export const COOKIES: Record<Role, string> = { producer: "qp_session", staff: "qp_staff", admin: "qp_admin" };
export const MAX_AGE: Record<Role, number> = { producer: 60 * 60 * 24 * 30, staff: 60 * 60 * 24, admin: 60 * 60 * 12 };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET precisa ter pelo menos 32 caracteres");
  return new TextEncoder().encode(s);
}

export async function signSession(role: Role, sub: string): Promise<string> {
  return new SignJWT({ role })
    .setSubject(sub)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE[role]}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined, role: Role): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.role === role && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
