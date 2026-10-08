/**
 * Rate limit simples em memória (janela fixa), por instância.
 * Suficiente para começar; com várias instâncias, troque por Redis (ex.: @upstash/ratelimit).
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 50_000) {
      for (const [k, v] of Array.from(buckets.entries())) if (v.resetAt < now) buckets.delete(k);
    }
    return true;
  }
  b.count++;
  return b.count <= limit;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
}
