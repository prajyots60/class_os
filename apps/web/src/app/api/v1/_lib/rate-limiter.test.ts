/**
 * Phase 1.12.4 — V1 Rate Limiter Unit Tests
 * Tests: read limit, mutation limit, Retry-After, key isolation
 */

import { describe, it, expect } from 'vitest';
import {
  assertReadRateLimit,
  assertMutationRateLimit,
  getRateLimitKey,
  RateLimitLimitError,
  READ_LIMIT,
  MUTATION_LIMIT,
} from './rate-limiter';

function makeReq(userId?: string, ip?: string): Request {
  const headers: Record<string, string> = {};
  if (ip) headers['x-forwarded-for'] = ip;
  return new Request('http://localhost/api/v1/students', { headers });
}

describe('getRateLimitKey', () => {
  it('uses user: prefix when userId provided', () => {
    const req = makeReq();
    expect(getRateLimitKey(req, 'usr-123')).toBe('user:usr-123');
  });

  it('falls back to ip: prefix when no userId', () => {
    const req = makeReq(undefined, '1.2.3.4');
    expect(getRateLimitKey(req)).toBe('ip:1.2.3.4');
  });

  it('uses unknown for missing IP header', () => {
    const req = makeReq();
    expect(getRateLimitKey(req)).toBe('ip:unknown');
  });
});

describe('assertReadRateLimit', () => {
  it('allows up to READ_LIMIT requests without throwing', () => {
    // Use a fresh unique userId to avoid cross-test state
    const userId = `read-test-${Math.random()}`;
    const req = makeReq();
    expect(() => {
      for (let i = 0; i < READ_LIMIT; i++) {
        assertReadRateLimit(req, userId);
      }
    }).not.toThrow();
  });

  it('throws RateLimitLimitError on exceeding READ_LIMIT', () => {
    const userId = `read-exceed-${Math.random()}`;
    const req = makeReq();
    expect(() => {
      for (let i = 0; i <= READ_LIMIT; i++) {
        assertReadRateLimit(req, userId);
      }
    }).toThrow(RateLimitLimitError);
  });

  it('thrown error has retryAfterSeconds > 0', () => {
    const userId = `read-retry-${Math.random()}`;
    const req = makeReq();
    let caught: RateLimitLimitError | null = null;
    try {
      for (let i = 0; i <= READ_LIMIT; i++) {
        assertReadRateLimit(req, userId);
      }
    } catch (e) {
      caught = e as RateLimitLimitError;
    }
    expect(caught).toBeInstanceOf(RateLimitLimitError);
    expect(caught!.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe('assertMutationRateLimit', () => {
  it('allows up to MUTATION_LIMIT requests without throwing', () => {
    const userId = `mut-test-${Math.random()}`;
    const req = makeReq();
    expect(() => {
      for (let i = 0; i < MUTATION_LIMIT; i++) {
        assertMutationRateLimit(req, userId);
      }
    }).not.toThrow();
  });

  it('throws RateLimitLimitError on exceeding MUTATION_LIMIT', () => {
    const userId = `mut-exceed-${Math.random()}`;
    const req = makeReq();
    expect(() => {
      for (let i = 0; i <= MUTATION_LIMIT; i++) {
        assertMutationRateLimit(req, userId);
      }
    }).toThrow(RateLimitLimitError);
  });

  it('read and mutation buckets are isolated (different keys)', () => {
    const userId = `isolated-${Math.random()}`;
    const req = makeReq();
    // Fill read bucket fully but don't touch mutation bucket
    expect(() => {
      for (let i = 0; i < READ_LIMIT; i++) {
        assertReadRateLimit(req, userId);
      }
    }).not.toThrow();
    // Mutation bucket should still be fresh
    expect(() => assertMutationRateLimit(req, userId)).not.toThrow();
  });

  it('SECURITY: different users have isolated buckets', () => {
    const userA = `a-${Math.random()}`;
    const userB = `b-${Math.random()}`;
    const req = makeReq();
    // Exhaust userA's mutation bucket
    try {
      for (let i = 0; i <= MUTATION_LIMIT; i++) {
        assertMutationRateLimit(req, userA);
      }
    } catch {}
    // userB must still be allowed
    expect(() => assertMutationRateLimit(req, userB)).not.toThrow();
  });
});

describe('RateLimitLimitError', () => {
  it('has code RATE_LIMITED', () => {
    const err = new RateLimitLimitError(30);
    expect(err.code).toBe('RATE_LIMITED');
  });

  it('has statusCode 429', () => {
    const err = new RateLimitLimitError(30);
    expect(err.statusCode).toBe(429);
  });

  it('preserves retryAfterSeconds', () => {
    const err = new RateLimitLimitError(45);
    expect(err.retryAfterSeconds).toBe(45);
  });
});
