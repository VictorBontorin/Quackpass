import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { refundOrder, RefundError } from "@/lib/orders";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Reembolso pedido pelo próprio comprador (só em eventos com reembolso pelo site). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!rateLimit(`refund:${clientIp(req)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const order = await db.order.findUnique({ where: { id: params.id }, select: { buyerEmail: true } });
  // Confirma o e-mail da compra: o link do pedido pode ter sido repassado a outra pessoa
  if (!order || order.buyerEmail !== email) {
    return NextResponse.json({ error: "O e-mail não confere com o da compra" }, { status: 403 });
  }
  try {
    await refundOrder(params.id, "BUYER");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RefundError) return NextResponse.json({ error: err.message }, { status: 409 });
    console.error("[refund]", err);
    return NextResponse.json({ error: "Erro inesperado" }, { status: 500 });
  }
}
