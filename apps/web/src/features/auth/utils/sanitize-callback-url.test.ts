import { describe, it, expect } from 'vitest';
import { sanitizeCallbackUrl } from './sanitize-callback-url';

describe('sanitizeCallbackUrl — canonical redirect security utility', () => {
  // ── Valid relative paths (should return the path) ─────────────────────────

  describe('Valid relative internal paths', () => {
    it('returns /dashboard as-is', () => {
      expect(sanitizeCallbackUrl('/dashboard')).toBe('/dashboard');
    });

    it('returns /onboarding as-is', () => {
      expect(sanitizeCallbackUrl('/onboarding')).toBe('/onboarding');
    });

    it('returns paths with query strings', () => {
      expect(sanitizeCallbackUrl('/dashboard?tab=attendance')).toBe(
        '/dashboard?tab=attendance',
      );
    });

    it('returns nested paths', () => {
      expect(sanitizeCallbackUrl('/dashboard/students')).toBe('/dashboard/students');
    });

    it('returns paths with multiple query params', () => {
      expect(sanitizeCallbackUrl('/dashboard?tab=fees&view=list')).toBe(
        '/dashboard?tab=fees&view=list',
      );
    });

    it('trims surrounding whitespace before validating', () => {
      expect(sanitizeCallbackUrl('  /dashboard  ')).toBe('/dashboard');
    });

    it('returns / root path', () => {
      expect(sanitizeCallbackUrl('/')).toBe('/');
    });
  });

  // ── Null / empty input ─────────────────────────────────────────────────────

  describe('Null and empty input', () => {
    it('returns null for null input', () => {
      expect(sanitizeCallbackUrl(null)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(sanitizeCallbackUrl('')).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
      expect(sanitizeCallbackUrl('   ')).toBeNull();
    });
  });

  // ── External HTTPS/HTTP URLs ───────────────────────────────────────────────

  describe('External URL rejection', () => {
    it('rejects https:// URLs', () => {
      expect(sanitizeCallbackUrl('https://evil.com')).toBeNull();
    });

    it('rejects http:// URLs', () => {
      expect(sanitizeCallbackUrl('http://evil.com')).toBeNull();
    });

    it('rejects https phishing with path', () => {
      expect(sanitizeCallbackUrl('https://evil.com/steal-session')).toBeNull();
    });
  });

  // ── Protocol-relative URLs ─────────────────────────────────────────────────

  describe('Protocol-relative URL rejection', () => {
    it('rejects //evil.com', () => {
      expect(sanitizeCallbackUrl('//evil.com')).toBeNull();
    });

    it('rejects //evil.com/path', () => {
      expect(sanitizeCallbackUrl('//evil.com/dashboard')).toBeNull();
    });
  });

  // ── Dangerous protocol schemes ─────────────────────────────────────────────

  describe('Dangerous scheme rejection', () => {
    it('rejects javascript: scheme', () => {
      expect(sanitizeCallbackUrl('javascript:alert(1)')).toBeNull();
    });

    it('rejects javascript: with encoding variation', () => {
      expect(sanitizeCallbackUrl('javascript:void(0)')).toBeNull();
    });

    it('rejects data: scheme', () => {
      expect(sanitizeCallbackUrl('data:text/html,<h1>xss</h1>')).toBeNull();
    });

    it('rejects vbscript: scheme', () => {
      expect(sanitizeCallbackUrl('vbscript:msgbox(1)')).toBeNull();
    });
  });

  // ── Backslash path traversal ───────────────────────────────────────────────

  describe('Backslash path traversal rejection', () => {
    it('rejects /\\evil.com (Windows path traversal variant)', () => {
      expect(sanitizeCallbackUrl('/\\evil.com')).toBeNull();
    });
  });

  // ── Paths not starting with / ─────────────────────────────────────────────

  describe('Paths not starting with slash', () => {
    it('rejects relative paths without leading slash', () => {
      expect(sanitizeCallbackUrl('dashboard')).toBeNull();
    });

    it('rejects bare domain without protocol', () => {
      expect(sanitizeCallbackUrl('evil.com')).toBeNull();
    });
  });
});
