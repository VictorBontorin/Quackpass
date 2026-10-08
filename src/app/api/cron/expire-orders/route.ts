import { NextResponse } from "next/server";
import { expireStaleOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

// Chame a cada minuto (Vercel Cron, GitHub Actions, crontab...) com Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const expired = await expireStaleOrders();
  return NextResponse.json({ expired });
}
