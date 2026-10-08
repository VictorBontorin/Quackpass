import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendTicketsEmail } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Reenvia os ingressos para o e-mail da compra. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!rateLimit(`resend:${clientIp(req)}`, 3, 60_000) || !rateLimit(`resend-order:${params.id}`, 3, 3_600_000)) {
    return NextResponse.json({ error: "Aguarde alguns minutos para reenviar de novo." }, { status: 429 });
  }
  const order = await db.order.findUnique({ where: { id: params.id }, select: { status: true } });
  if (order?.status !== "PAID") return NextResponse.json({ error: "Pedido não está pago" }, { status: 409 });
  await sendTicketsEmail(params.id);
  return NextResponse.json({ ok: true });
}
