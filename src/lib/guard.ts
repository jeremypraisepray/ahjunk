/**
 * Best-effort spam/duplicate guards. In-memory per serverless instance — good enough
 * against double-clicks and casual abuse; add Cloudflare Turnstile if real spam shows up.
 */
const hits = new Map<string, number[]>();
const recent = new Map<string, number>();

export const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };

export function rateLimited(ip: string, now = Date.now()) {
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT.windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > RATE_LIMIT.max;
}

/** True if the same phone already submitted within this minute (double-click / resubmit). */
export async function isDuplicate(phone: string, now = Date.now()) {
  const minute = Math.floor(now / 60000);
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${phone}|${minute}`));
  const key = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  for (const [k, t] of recent) if (now - t > 120_000) recent.delete(k);
  if (recent.has(key)) return true;
  recent.set(key, now);
  return false;
}
