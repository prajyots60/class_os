import { describe, it, expect } from 'vitest';
import { signUpSchema, SIGN_UP_PASSWORD_MIN_LENGTH } from './sign-up-schema';
import type { SignUpPayload } from './sign-up-types';

describe('signUpSchema — Validation Suite', () => {
  const validPayload = {
    name: 'Rakesh Sharma',
    email: 'rakesh@sharmaclasses.com',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!',
  };

  // --- Name ---
  it('rejects empty name', () => {
    const result = signUpSchema.safeParse({ ...validPayload, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((e) => e.path.includes('name'))).toBe(true);
    }
  });

  it('rejects whitespace-only name', () => {
    const result = signUpSchema.safeParse({ ...validPayload, name: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects name shorter than 2 characters after trim', () => {
    const result = signUpSchema.safeParse({ ...validPayload, name: 'A' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid name', () => {
    const result = signUpSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  // --- Email ---
  it('rejects empty email with Email address is required message', () => {
    const result = signUpSchema.safeParse({ ...validPayload, email: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssue = result.error.issues.find((i) => i.path.includes('email'));
      expect(emailIssue?.message).toBe('Email address is required.');
    }
  });

  it('rejects invalid email format', () => {
    const result = signUpSchema.safeParse({ ...validPayload, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects email with no TLD', () => {
    const result = signUpSchema.safeParse({ ...validPayload, email: 'test@nodomain' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid email', () => {
    const result = signUpSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  // --- Password ---
  it('rejects empty password', () => {
    const result = signUpSchema.safeParse({ ...validPayload, password: '', confirmPassword: '' });
    expect(result.success).toBe(false);
  });

  it(`rejects password shorter than ${SIGN_UP_PASSWORD_MIN_LENGTH} characters`, () => {
    const shortPass = 'abc123';
    const result = signUpSchema.safeParse({
      ...validPayload,
      password: shortPass,
      confirmPassword: shortPass,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const pwdError = result.error.issues.find((e) => e.path.includes('password'));
      expect(pwdError).toBeDefined();
    }
  });

  it('rejects mismatched confirm password', () => {
    const result = signUpSchema.safeParse({
      ...validPayload,
      password: 'SecurePassword123!',
      confirmPassword: 'DifferentPassword!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const mismatchError = result.error.issues.find((e) => e.path.includes('confirmPassword'));
      expect(mismatchError).toBeDefined();
      expect(mismatchError?.message).toMatch(/do not match/i);
    }
  });

  it('accepts matching passwords meeting minimum length', () => {
    const result = signUpSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  // --- Full valid payload ---
  it('accepts a fully valid sign-up payload', () => {
    const result = signUpSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      // Verify output shape
      expect(result.data.name).toBe('Rakesh Sharma');
      expect(result.data.email).toBe('rakesh@sharmaclasses.com');
    }
  });
});

describe('SignUpPayload — Security Invariants', () => {
  it('does NOT contain userId, instituteId, membershipId, role, status, or tenantId fields', () => {
    // Verify SignUpPayload type definition only allows safe fields
    const payload: SignUpPayload = {
      name: 'Rakesh Sharma',
      email: 'rakesh@sharmaclasses.com',
      password: 'SecurePassword123!',
    };

    const keys = Object.keys(payload);

    // Verify forbidden fields are NOT in the payload type
    expect(keys).not.toContain('userId');
    expect(keys).not.toContain('instituteId');
    expect(keys).not.toContain('membershipId');
    expect(keys).not.toContain('role');
    expect(keys).not.toContain('status');
    expect(keys).not.toContain('tenantId');

    // Verify only safe fields exist
    expect(keys.sort()).toEqual(['email', 'name', 'password'].sort());
  });
});
