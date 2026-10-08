import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { releaseOrder, syncOrderWithGateway } from "@/lib/orders";

export const dynamic = "force-dynamic";

// Consultado pela tela do Pix a cada poucos segundos
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const order = await db.order.findUnique({ where: { id: params.id }, select: { id: true, status: true, expiresAt: true, updatedAt: true } });
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  let status = order.status;
  if (status === "PENDING") {
    // O webhook é o caminho principal; consultar o gateway (no máx. a cada 10s) é a rede de segurança
    if (Date.now() - order.updatedAt.getTime() > 10_000) {
      await db.order.update({ where: { id: order.id }, data: { updatedAt: new Date() } });
      status = (await syncOrderWithGateway(order.id).catch(() => status)) ?? status;
    }
    if (status === "PENDING" && order.expiresAt.getTime() < Date.now() - 2 * 60_000) {
      await releaseOrder(order.id, "EXPIRED", "Tempo para pagamento esgotado");
      status = "EXPIRED";
    }
  }
  return NextResponse.json({ status });
}
