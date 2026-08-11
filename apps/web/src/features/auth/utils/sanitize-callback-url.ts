/**
 * sanitize-callback-url.ts
 *
 * Canonical security utility for validating redirect callback URLs.
 *
 * SECURITY CONTRACT:
 * - Only allows relative internal paths (starting with a single '/')
 * - Rejects all external URLs (https://, http://, //evil.com)
 * - Rejects protocol-relative URLs (//evil.com)
 * - Rejects backslash-relative paths (/\evil.com)
 * - Rejects protocol schemes (javascript:, data:, vbscript:, etc.)
 * - Returns null for any invalid/missing input
 *
 * Both sign-in and server-side route guards use this SAME implementation.
 * Never duplicate open-redirect protection logic.
 */

/**
 * Sanitizes a raw callbackUrl query parameter.
 *
 * @param url - Raw string from query parameter or null
 * @returns A safe relative path string, or null if the input is invalid/external
 *
 * @example
 * sanitizeCallbackUrl('/dashboard')          → '/dashboard'
 * sanitizeCallbackUrl('/dashboard?tab=fees') → '/dashboard?tab=fees'
 * sanitizeCallbackUrl('https://evil.com')    → null
 * sanitizeCallbackUrl('//evil.com')          → null
 * sanitizeCallbackUrl('javascript:alert(1)') → null
 * sanitizeCallbackUrl(null)                  → null
 */
export function sanitizeCallbackUrl(url: string | null): string | null {
  if (!url) return null;

  const trimmed = url.trim();

  // Must start with a single '/'
  if (!trimmed.startsWith('/')) return null;

  // Reject protocol-relative URLs: //evil.com
  if (trimmed.startsWith('//')) return null;

  // Reject backslash-relative paths: /\evil.com (Windows path traversal variant)
  if (trimmed.startsWith('/\\')) return null;

  // Reject any protocol scheme: javascript:, data:, vbscript:, https:, http:, etc.
  if (/^[a-z0-9+\-.]+:/i.test(trimmed)) return null;

  return trimmed;
}
