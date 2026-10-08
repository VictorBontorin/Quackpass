import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CheckoutError, checkoutSchema, createOrder } from "@/lib/orders";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!rateLimit(`checkout:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
  }
  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: `Dados inválidos: ${first?.path.join(".")} ${first?.message}` }, { status: 400 });
  }
  try {
    const order = await createOrder(parsed.data);
    const fresh = await db.order.findUniqueOrThrow({ where: { id: order.id }, select: { status: true, authUrl: true, failureReason: true } });
    if (fresh.status === "FAILED") {
      return NextResponse.json({ error: fresh.failureReason ?? "Pagamento recusado" }, { status: 402 });
    }
    return NextResponse.json({ orderId: order.id, status: fresh.status, authUrl: fresh.status === "PENDING" ? fresh.authUrl : null });
  } catch (err) {
    if (err instanceof CheckoutError) return NextResponse.json({ error: err.message }, { status: 409 });
    console.error("[checkout]", err);
    return NextResponse.json({ error: "Erro inesperado. Tente novamente." }, { status: 500 });
  }
}
