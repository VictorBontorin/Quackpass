import { NextResponse } from "next/server";
import { findValidCoupon } from "@/lib/orders";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!rateLimit(`coupon:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas" }, { status: 429 });
  }
  const url = new URL(req.url);
  const coupon = await findValidCoupon(url.searchParams.get("eventId") ?? "", url.searchParams.get("code"));
  if (!coupon) return NextResponse.json({ error: "Cupom inválido ou esgotado" }, { status: 404 });
  return NextResponse.json({
    code: coupon.code,
    discountType: coupon.discountType,
    value: coupon.value,
    advertiserName: coupon.advertiser?.name ?? null,
  });
}
