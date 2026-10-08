import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "qp_session";

// Barra rapidamente quem não está logado no painel (a checagem completa acontece em requireProducer)
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let ok = false;
  if (token && process.env.AUTH_SECRET) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
      ok = true;
    } catch {}
  }
  if (!ok) return NextResponse.redirect(new URL("/produtor/login", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/painel/:path*"] };
