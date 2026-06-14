type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * Simple fixed-window rate limiter for middleware / route handlers (in-process).
 * For production at scale, replace with Redis/Upstash.
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  let e = buckets.get(key);
  if (!e || now >= e.resetAt) {
    e = { count: 1, resetAt: now + windowMs };
    buckets.set(key, e);
    return { ok: true };
  }
  e.count += 1;
  if (e.count > max) {
    return { ok: false, retryAfterSec: Math.ceil((e.resetAt - now) / 1000) };
  }
  return { ok: true };
}

export function clientIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() || 'unknown';
  const rip = req.headers.get('x-real-ip');
  if (rip) return rip;
  return 'unknown';
}
