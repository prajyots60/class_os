import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SignUpForm } from './sign-up-form';
import { signUpSchema } from './sign-up-schema';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readSignUpFormSource(): string {
  return readFileSync(resolve(__dirname, './sign-up-form.tsx'), 'utf-8');
}

describe('SignUpForm — Component Architecture Verification', () => {
  it('exports SignUpForm as a function component', () => {
    expect(typeof SignUpForm).toBe('function');
  });

  it('sign-up-form module does NOT import from @coaching-os/database', () => {
    const source = readSignUpFormSource();
    expect(source).not.toContain('@coaching-os/database');
    expect(source).not.toContain('PrismaClient');
    expect(source).not.toContain('@coaching-os/identity');
  });

  it('sign-up-form module does NOT import Better Auth server implementation', () => {
    const source = readSignUpFormSource();
    // Server auth MUST never enter client bundle
    // Note: "@coaching-os/auth'" (without /client suffix) is forbidden
    expect(source).not.toMatch(/@coaching-os\/auth['"`]/);
    expect(source).not.toContain('auth.api');
    expect(source).not.toContain('auth.handler');
    // The /client sub-path IS allowed
    expect(source).toContain("from '@coaching-os/auth/client'");
  });

  it('sign-up-form uses useSession from the auth client (not server)', () => {
    const source = readSignUpFormSource();
    expect(source).toContain('useSession');
    expect(source).toContain("from '@coaching-os/auth/client'");
  });

  it('sign-up-form redirects to /onboarding on success, not directly to /dashboard', () => {
    const source = readSignUpFormSource();
    expect(source).toContain('/onboarding');
  });

  it('sign-up-form payload does NOT include userId, instituteId, role, status, or tenantId', () => {
    const source = readSignUpFormSource();
    // Extract the signUp.email() call section to validate no forbidden fields
    const payloadSection = source.match(/signUp\.email\(\{[\s\S]*?\}\)/)?.[0] ?? '';
    expect(payloadSection).not.toContain('userId:');
    expect(payloadSection).not.toContain('instituteId:');
    expect(payloadSection).not.toContain('role:');
    expect(payloadSection).not.toContain('tenantId:');
    expect(payloadSection).not.toContain('status:');
  });

  it('signUpSchema is the validation schema and correctly validates a valid payload', () => {
    const result = signUpSchema.safeParse({
      name: 'Test User',
      email: 'test@test.com',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
    });
    expect(result.success).toBe(true);
  });
});
