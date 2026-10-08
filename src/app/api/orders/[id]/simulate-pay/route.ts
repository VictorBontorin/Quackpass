import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { markOrderPaid } from "@/lib/orders";

// Só existe com o gateway falso (desenvolvimento)
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (env.paymentProvider !== "mock") return NextResponse.json({ error: "not found" }, { status: 404 });
  await markOrderPaid(params.id);
  return NextResponse.json({ ok: true });
}
