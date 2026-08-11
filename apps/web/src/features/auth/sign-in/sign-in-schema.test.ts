import { describe, it, expect } from 'vitest';
import { signInSchema } from './sign-in-schema';
import type { SignInPayload } from './sign-in-types';

describe('signInSchema — Validation Suite', () => {
  const validPayload = {
    email: 'rakesh@sharmaclasses.com',
    password: 'SecurePassword123!',
  };

  // --- Email ---
  it('rejects empty email with "Email address is required." message', () => {
    const result = signInSchema.safeParse({ ...validPayload, email: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('email'));
      expect(issue).toBeDefined();
      expect(issue?.message).toBe('Email address is required.');
    }
  });

  it('rejects invalid email format with "Please enter a valid email address." message', () => {
    const result = signInSchema.safeParse({ ...validPayload, email: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('email'));
      expect(issue).toBeDefined();
      expect(issue?.message).toBe('Please enter a valid email address.');
    }
  });

  it('accepts valid email', () => {
    const result = signInSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  // --- Password ---
  it('rejects empty password with "Password is required." message', () => {
    const result = signInSchema.safeParse({ ...validPayload, password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('password'));
      expect(issue).toBeDefined();
      expect(issue?.message).toBe('Password is required.');
    }
  });

  it('accepts valid password', () => {
    const result = signInSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  // --- Complete Valid Payload ---
  it('accepts fully valid sign-in payload', () => {
    const result = signInSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('rakesh@sharmaclasses.com');
      expect(result.data.password).toBe('SecurePassword123!');
    }
  });
});

describe('SignInPayload — Security Invariants', () => {
  it('does NOT contain userId, instituteId, membershipId, role, status, or tenantId fields', () => {
    const payload: SignInPayload = {
      email: 'rakesh@sharmaclasses.com',
      password: 'SecurePassword123!',
    };

    const keys = Object.keys(payload);

    expect(keys).not.toContain('userId');
    expect(keys).not.toContain('instituteId');
    expect(keys).not.toContain('membershipId');
    expect(keys).not.toContain('role');
    expect(keys).not.toContain('status');
    expect(keys).not.toContain('tenantId');

    expect(keys.sort()).toEqual(['email', 'password'].sort());
  });
});
