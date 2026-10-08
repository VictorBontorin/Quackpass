import { z } from "zod";

/** Blocos que o produtor monta na página do evento. Guardados em Event.content (JSON). */
const url = z.string().trim().max(500).refine((u) => u.startsWith("/api/uploads/") || /^https:\/\//.test(u), "URL inválida");

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), title: z.string().max(120).default(""), body: z.string().max(8000).default("") }),
  z.object({ type: z.literal("image"), url, caption: z.string().max(200).default("") }),
  z.object({ type: z.literal("gallery"), title: z.string().max(120).default(""), images: z.array(url).max(24) }),
  z.object({
    type: z.literal("lineup"),
    title: z.string().max(120).default("Atrações"),
    items: z.array(z.object({ name: z.string().max(120), detail: z.string().max(120).default("") })).max(40),
  }),
  z.object({ type: z.literal("video"), url: z.string().trim().max(300) }),
  z.object({
    type: z.literal("faq"),
    title: z.string().max(120).default("Perguntas frequentes"),
    items: z.array(z.object({ q: z.string().max(200), a: z.string().max(2000) })).max(30),
  }),
]);

export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];

export const contentSchema = z.array(blockSchema).max(40);

export function parseContent(raw: unknown): Block[] {
  const parsed = contentSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

/** Aceita links do YouTube (watch, youtu.be, shorts) e devolve a URL de embed. */
export function youtubeEmbed(input: string): string | null {
  try {
    const u = new URL(input);
    let id: string | null = null;
    if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    else if (u.hostname.endsWith("youtube.com")) {
      id = u.searchParams.get("v") ?? u.pathname.match(/^\/(shorts|embed)\/([\w-]+)/)?.[2] ?? null;
    }
    return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

/** Cores pré-aprovadas: todas com bom contraste com texto branco. */
export const ACCENT_COLORS = [
  { value: "#1d4ed8", name: "Azul" },
  { value: "#0f766e", name: "Verde-petróleo" },
  { value: "#15803d", name: "Verde" },
  { value: "#7c3aed", name: "Roxo" },
  { value: "#be123c", name: "Vermelho" },
  { value: "#c2410c", name: "Laranja" },
  { value: "#a16207", name: "Dourado" },
  { value: "#0f172a", name: "Preto" },
];
