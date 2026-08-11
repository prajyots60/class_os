import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SignInForm, mapSignInError } from './sign-in-form';
import { sanitizeCallbackUrl } from '../utils/sanitize-callback-url';
import { signInSchema } from './sign-in-schema';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readSignInFormSource(): string {
  return readFileSync(resolve(__dirname, './sign-in-form.tsx'), 'utf-8');
}

describe('SignInForm — Component Architecture Verification', () => {
  it('exports SignInForm as a function component', () => {
    expect(typeof SignInForm).toBe('function');
  });

  it('sign-in-form module does NOT import from @coaching-os/database', () => {
    const source = readSignInFormSource();
    expect(source).not.toContain('@coaching-os/database');
    expect(source).not.toContain('PrismaClient');
    expect(source).not.toContain('@coaching-os/identity');
  });

  it('sign-in-form module does NOT import Better Auth server implementation', () => {
    const source = readSignInFormSource();
    // Server auth MUST never enter client bundle
    expect(source).not.toMatch(/@coaching-os\/auth['"`]/);
    expect(source).not.toContain('auth.api');
    expect(source).not.toContain('auth.handler');
    // The /client sub-path IS allowed
    expect(source).toContain("from '@coaching-os/auth/client'");
  });

  it('sign-in-form uses signIn.email and useSession from the auth client', () => {
    const source = readSignInFormSource();
    expect(source).toContain('signIn');
    expect(source).toContain('useSession');
    expect(source).toContain("from '@coaching-os/auth/client'");
  });

  it('sign-in-form payload does NOT include userId, instituteId, role, status, or tenantId', () => {
    const source = readSignInFormSource();
    const payloadSection = source.match(/signIn\.email\(\{[\s\S]*?\}\)/)?.[0] ?? '';
    expect(payloadSection).not.toContain('userId:');
    expect(payloadSection).not.toContain('instituteId:');
    expect(payloadSection).not.toContain('role:');
    expect(payloadSection).not.toContain('tenantId:');
    expect(payloadSection).not.toContain('status:');
  });

  it('signInSchema correctly validates sign-in form values', () => {
    const result = signInSchema.safeParse({
      email: 'test@test.com',
      password: 'SecurePassword123!',
    });
    expect(result.success).toBe(true);
  });
});

describe('sanitizeCallbackUrl — Security Helper Suite', () => {
  it('allows safe relative internal path /dashboard', () => {
    expect(sanitizeCallbackUrl('/dashboard')).toBe('/dashboard');
  });

  it('allows safe relative internal path with query string', () => {
    expect(sanitizeCallbackUrl('/onboarding?ref=nav')).toBe('/onboarding?ref=nav');
  });

  it('rejects null or empty callbackUrl', () => {
    expect(sanitizeCallbackUrl(null)).toBeNull();
    expect(sanitizeCallbackUrl('')).toBeNull();
    expect(sanitizeCallbackUrl('   ')).toBeNull();
  });

  it('rejects external URL https://evil.com', () => {
    expect(sanitizeCallbackUrl('https://evil.com')).toBeNull();
  });

  it('rejects protocol-relative URL //evil.com', () => {
    expect(sanitizeCallbackUrl('//evil.com')).toBeNull();
  });

  it('rejects backslash protocol-relative URL /\\evil.com', () => {
    expect(sanitizeCallbackUrl('/\\evil.com')).toBeNull();
  });

  it('rejects javascript: scheme URL', () => {
    expect(sanitizeCallbackUrl('javascript:alert(1)')).toBeNull();
  });
});

describe('mapSignInError — Safe Error Mapping Suite', () => {
  it('maps invalid credentials errors to safe message', () => {
    expect(mapSignInError(new Error('Invalid email or password'))).toBe('Invalid email or password.');
    expect(mapSignInError(new Error('Invalid credentials'))).toBe('Invalid email or password.');
    expect(mapSignInError(new Error('User not found'))).toBe('Invalid email or password.');
  });

  it('maps rate limit errors to safe message', () => {
    expect(mapSignInError(new Error('Too many requests, rate limit exceeded'))).toBe(
      'Too many sign-in attempts. Please wait a moment and try again.',
    );
  });

  it('maps network errors to safe message', () => {
    expect(mapSignInError(new Error('Failed to fetch'))).toBe(
      "We couldn't reach CoachingOS. Check your connection and try again.",
    );
  });

  it('maps unknown/raw errors to fallback message without leaking details', () => {
    expect(mapSignInError(new Error('PrismaClientKnownRequestError: P2002'))).toBe(
      'Invalid email or password.',
    );
  });
});
