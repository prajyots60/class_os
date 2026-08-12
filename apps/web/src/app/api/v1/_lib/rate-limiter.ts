import { RateLimitError } from '@coaching-os/shared';

/**
 * ADR-0015 Rate Limit Buckets
 * - READ:     100 req/min per identity key
 * - MUTATION: 30  req/min per identity key
 */
const READ_LIMIT = 100;
const MUTATION_LIMIT = 30;
const WINDOW_MS = 60_000;

interface BucketEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, BucketEntry>();

function getBucket(key: string, _limit: number): BucketEntry {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(key, entry);
  }
  return entry;
}

function incrementAndCheck(key: string, limit: number): { allowed: boolean; retryAfter: number } {
  const entry = getBucket(key, limit);
  entry.count += 1;
  const remaining = limit - entry.count;
  const retryAfter = Math.ceil((entry.resetAt - Date.now()) / 1000);
  return { allowed: remaining >= 0, retryAfter };
}

/**
 * Derives a rate-limit identity key: session userId if available, else client IP.
 * Never trusts client-supplied headers to bypass the limiter.
 */
export function getRateLimitKey(req: Request, userId?: string): string {
  if (userId) return `user:${userId}`;
  // Derive IP from forwarded headers (read-only, cannot be trivially spoofed at LB level)
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return `ip:${ip}`;
}

/**
 * Asserts a READ request is within its rate limit.
 * Throws RateLimitError (429) if exceeded.
 */
export function assertReadRateLimit(req: Request, userId?: string): void {
  const key = `read:${getRateLimitKey(req, userId)}`;
  const { allowed, retryAfter } = incrementAndCheck(key, READ_LIMIT);
  if (!allowed) {
    throw new RateLimitLimitError(retryAfter);
  }
}

/**
 * Asserts a MUTATION request is within its rate limit.
 * Throws RateLimitError (429) if exceeded.
 */
export function assertMutationRateLimit(req: Request, userId?: string): void {
  const key = `mut:${getRateLimitKey(req, userId)}`;
  const { allowed, retryAfter } = incrementAndCheck(key, MUTATION_LIMIT);
  if (!allowed) {
    throw new RateLimitLimitError(retryAfter);
  }
}

/** Extended RateLimitError carrying Retry-After seconds */
export class RateLimitLimitError extends RateLimitError {
  public readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super('Rate limit exceeded. Please slow down and try again.');
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// Expose limits for deterministic test configuration
export { READ_LIMIT, MUTATION_LIMIT, WINDOW_MS };
