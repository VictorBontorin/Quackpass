import { db } from "@/lib/db";

// Imagens nunca mudam (cada envio gera um id novo): cache de 1 ano no navegador e na CDN
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const upload = await db.upload.findUnique({ where: { id: params.id }, select: { data: true, mimeType: true } });
  if (!upload) return new Response("not found", { status: 404 });
  return new Response(upload.data, {
    headers: {
      "Content-Type": upload.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
