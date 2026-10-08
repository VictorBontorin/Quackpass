import { NextResponse } from "next/server";
import { currentProducerId } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { detectImageType, MAX_UPLOAD_BYTES } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const producerId = await currentProducerId();
  if (!producerId) return NextResponse.json({ error: "Faça login novamente" }, { status: 401 });
  if (!rateLimit(`upload:${producerId}`, 60, 60_000)) return NextResponse.json({ error: "Muitos envios. Aguarde." }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Imagem maior que 5 MB" }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const mimeType = detectImageType(buf);
  if (!mimeType) return NextResponse.json({ error: "Envie uma imagem JPG, PNG, WEBP ou GIF" }, { status: 415 });

  const upload = await db.upload.create({ data: { producerId, mimeType, size: buf.length, data: buf }, select: { id: true } });
  return NextResponse.json({ url: `/api/uploads/${upload.id}` });
}
