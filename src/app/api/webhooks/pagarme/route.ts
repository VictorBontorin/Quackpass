import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncOrderWithGateway } from "@/lib/orders";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const user = process.env.PAGARME_WEBHOOK_USER;
  const pass = process.env.PAGARME_WEBHOOK_PASSWORD;
  if (!user || !pass) return false;
  const expected = Buffer.from("Basic " + Buffer.from(`${user}:${pass}`).toString("base64"));
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/**
 * Webhook da Pagar.me. Não confiamos no corpo: usamos só para saber QUAL pedido mudou
 * e consultamos o status real na API. Reenvios são ignorados via tabela WebhookEvent.
 */
export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.type) return NextResponse.json({ error: "bad request" }, { status: 400 });

  try {
    await db.webhookEvent.create({ data: { id: String(body.id), type: String(body.type) } });
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const data = body.data ?? {};
  // Eventos order.* trazem o pedido; charge.* trazem a cobrança com o pedido aninhado
  const ourOrderId: string | undefined = data.code ?? data.order?.code ?? data.metadata?.order_id;
  const gatewayOrderId: string | undefined = body.type.startsWith("order.") ? data.id : data.order?.id;

  const order = ourOrderId
    ? await db.order.findUnique({ where: { id: ourOrderId }, select: { id: true } })
    : gatewayOrderId
      ? await db.order.findUnique({ where: { gatewayOrderId }, select: { id: true } })
      : null;

  if (order) {
    try {
      await syncOrderWithGateway(order.id);
    } catch (err) {
      // Apaga o registro para o reenvio do gateway ser processado
      await db.webhookEvent.delete({ where: { id: String(body.id) } }).catch(() => {});
      console.error("[webhook] falha ao sincronizar", order.id, err);
      return NextResponse.json({ error: "retry" }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
