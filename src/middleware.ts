import { NextResponse, type NextRequest } from "next/server";
import { COOKIES, verifySession, type Role } from "@/lib/session";

/**
 * Separa as quatro áreas por endereço (quando configurado) e protege as áreas logadas.
 *   APP_URL      → site de compra       (/, /evento, /pedido...)
 *   PRODUCER_URL → área do produtor      (/produtor, /painel, /previa)
 *   STAFF_URL    → portaria              (/portaria)
 *   ADMIN_URL    → administração         (/admin)
 * Sem as variáveis, tudo funciona no mesmo endereço (desenvolvimento).
 */
type Area = "site" | "producer" | "staff" | "admin";

function areaOf(path: string): Area {
  if (path.startsWith("/painel") || path.startsWith("/produtor") || path.startsWith("/previa")) return "producer";
  if (path.startsWith("/portaria")) return "staff";
  if (path.startsWith("/admin")) return "admin";
  return "site";
}

const HOME: Record<Area, string> = { site: "/", producer: "/painel", staff: "/portaria", admin: "/admin" };

function urlFor(area: Area): string | undefined {
  const v = { site: process.env.APP_URL, producer: process.env.PRODUCER_URL, staff: process.env.STAFF_URL, admin: process.env.ADMIN_URL }[area];
  return v || undefined;
}

function hostOf(url: string | undefined) {
  try {
    return url ? new URL(url).host : undefined;
  } catch {
    return undefined;
  }
}

const PUBLIC_PATHS: Record<Exclude<Area, "site">, (p: string) => boolean> = {
  producer: (p) => /^\/produtor\/(login|cadastro|esqueci-senha|redefinir-senha)/.test(p),
  staff: (p) => p === "/portaria",
  admin: (p) => p === "/admin/entrar",
};
const ROLE: Record<Exclude<Area, "site">, Role> = { producer: "producer", staff: "staff", admin: "admin" };
const LOGIN: Record<Exclude<Area, "site">, string> = { producer: "/produtor/login", staff: "/portaria", admin: "/admin/entrar" };

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const area = areaOf(path);

  // 1) Cada área no seu endereço (só se os endereços estiverem configurados)
  const host = req.headers.get("host");
  const hostArea = (["producer", "staff", "admin", "site"] as Area[]).find((a) => hostOf(urlFor(a)) === host);
  if (hostArea && hostArea !== "site" && path === "/") {
    return NextResponse.redirect(new URL(HOME[hostArea], req.url));
  }
  if (hostArea && hostArea !== area) {
    const target = urlFor(area);
    if (target) return NextResponse.redirect(new URL(path + req.nextUrl.search, target));
  }

  // 2) Áreas logadas: sem sessão válida, vai para o login daquela área
  if (area !== "site" && !PUBLIC_PATHS[area](path)) {
    const ok = await verifySession(req.cookies.get(COOKIES[ROLE[area]])?.value, ROLE[area]);
    if (!ok) return NextResponse.redirect(new URL(LOGIN[area], req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Tudo menos API, arquivos do Next e imagens enviadas (que valem em qualquer endereço)
  matcher: ["/((?!api/|_next/|favicon.ico|robots.txt).*)"],
};
