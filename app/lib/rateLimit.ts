// Simple sliding window rate limiter
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts.entries()) {
    if (now > entry.resetAt) {
      attempts.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 10,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const entry = attempts.get(identifier);

  if (!entry || now > entry.resetAt) {
    attempts.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetInMs: windowMs };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetInMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxAttempts - entry.count, resetInMs: entry.resetAt - now };
}
