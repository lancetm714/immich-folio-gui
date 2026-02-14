/**
 * In-memory sliding-window rate limiter.
 * Tracks request counts per IP per minute bucket.
 * Auto-evicts expired entries to prevent memory leaks.
 */

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Evict expired entries periodically (every 60s)
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}

/**
 * Check if a request should be allowed.
 * @param ip - Client IP address
 * @param maxRpm - Maximum requests per minute
 * @returns { success, remaining, resetAt (epoch ms) }
 */
export function checkRateLimit(
  ip: string,
  maxRpm: number,
): { success: boolean; remaining: number; resetAt: number } {
  cleanup();

  const now = Date.now();
  const windowMs = 60_000;
  const key = `rl:${ip}`;

  const entry = store.get(key);

  // New window or expired
  if (!entry || now > entry.expiresAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, expiresAt: resetAt });
    return { success: true, remaining: maxRpm - 1, resetAt };
  }

  // Within window
  entry.count++;
  if (entry.count > maxRpm) {
    return { success: false, remaining: 0, resetAt: entry.expiresAt };
  }

  return { success: true, remaining: maxRpm - entry.count, resetAt: entry.expiresAt };
}
