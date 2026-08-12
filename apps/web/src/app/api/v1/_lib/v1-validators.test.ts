/**
 * Phase 1.12.3 — V1 Presentation Validator Unit Tests
 * Tests: valid payloads, missing fields, invalid UUIDs, invalid enums,
 *        excessive lengths, invalid pagination, page > 100,
 *        unknown field injection (instituteId, userId, role, membershipId, tenantId)
 */

import { describe, it, expect } from 'vitest';
import {
  v1ListStudentsQuerySchema,
  v1UpdateStudentSchema,
  v1ListGuardiansQuerySchema,
  v1ListStaffQuerySchema,
  v1ListEnrollmentsQuerySchema,
  uuidParamSchema,
  MAX_PAGE_SIZE,
} from './v1-validators';

// ─── uuidParamSchema ─────────────────────────────────────────────────────────

describe('uuidParamSchema', () => {
  it('accepts a valid UUID', () => {
    const r = uuidParamSchema.safeParse({ id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(r.success).toBe(true);
  });

  it('rejects a non-UUID string', () => {
    const r = uuidParamSchema.safeParse({ id: 'not-a-uuid' });
    expect(r.success).toBe(false);
  });

  it('rejects an empty string', () => {
    const r = uuidParamSchema.safeParse({ id: '' });
    expect(r.success).toBe(false);
  });

  it('rejects missing id', () => {
    const r = uuidParamSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});

// ─── v1ListStudentsQuerySchema ────────────────────────────────────────────────

describe('v1ListStudentsQuerySchema', () => {
  it('accepts a valid filter object', () => {
    const r = v1ListStudentsQuerySchema.safeParse({
      search: 'Aarav',
      status: 'active',
      admissionStatus: 'admitted',
      limit: '20',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.limit).toBe(20);
      expect(r.data.status).toBe('active');
    }
  });

  it('uses default limit of 25', () => {
    const r = v1ListStudentsQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(25);
  });

  it(`rejects limit > ${MAX_PAGE_SIZE}`, () => {
    const r = v1ListStudentsQuerySchema.safeParse({ limit: '101' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid status enum', () => {
    const r = v1ListStudentsQuerySchema.safeParse({ status: 'deleted' });
    expect(r.success).toBe(false);
  });

  it('rejects search string > 200 chars', () => {
    const r = v1ListStudentsQuerySchema.safeParse({ search: 'a'.repeat(201) });
    expect(r.success).toBe(false);
  });

  // Mass assignment / field injection
  it('SECURITY: rejects instituteId injection', () => {
    const r = v1ListStudentsQuerySchema.safeParse({ instituteId: 'foreign-institute' });
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects userId injection', () => {
    const r = v1ListStudentsQuerySchema.safeParse({ userId: 'hacker-user-id' });
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects role injection', () => {
    const r = v1ListStudentsQuerySchema.safeParse({ role: 'owner' });
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects membershipId injection', () => {
    const r = v1ListStudentsQuerySchema.safeParse({ membershipId: 'mbr-123' });
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects tenantId injection', () => {
    const r = v1ListStudentsQuerySchema.safeParse({ tenantId: 'some-tenant' });
    expect(r.success).toBe(false);
  });
});

// ─── v1UpdateStudentSchema ────────────────────────────────────────────────────

describe('v1UpdateStudentSchema', () => {
  it('accepts valid partial update (firstName only)', () => {
    const r = v1UpdateStudentSchema.safeParse({ firstName: 'Ravi' });
    expect(r.success).toBe(true);
  });

  it('accepts valid multi-field update', () => {
    const r = v1UpdateStudentSchema.safeParse({
      firstName: 'Ravi',
      lastName: 'Kumar',
      email: 'ravi@example.com',
      phone: '+919876543210',
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty update (no fields)', () => {
    const r = v1UpdateStudentSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects status field injection', () => {
    const r = v1UpdateStudentSchema.safeParse({ firstName: 'Ravi', status: 'active' });
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects admissionStatus field injection', () => {
    const r = v1UpdateStudentSchema.safeParse({ admissionStatus: 'admitted' });
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects role field injection', () => {
    const r = v1UpdateStudentSchema.safeParse({ role: 'owner' });
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects instituteId field injection', () => {
    const r = v1UpdateStudentSchema.safeParse({ instituteId: 'foreign' });
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects userId field injection', () => {
    const r = v1UpdateStudentSchema.safeParse({ userId: 'hacker' });
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects membershipId field injection', () => {
    const r = v1UpdateStudentSchema.safeParse({ membershipId: 'mbr-123' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid gender enum', () => {
    const r = v1UpdateStudentSchema.safeParse({ gender: 'unknown' });
    expect(r.success).toBe(false);
  });

  it('rejects firstName exceeding 100 chars', () => {
    const r = v1UpdateStudentSchema.safeParse({ firstName: 'a'.repeat(101) });
    expect(r.success).toBe(false);
  });

  it('rejects email in invalid format', () => {
    const r = v1UpdateStudentSchema.safeParse({ email: 'not-an-email' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid date format for dateOfBirth', () => {
    const r = v1UpdateStudentSchema.safeParse({ dateOfBirth: '12-31-2000' });
    expect(r.success).toBe(false);
  });

  it('accepts YYYY-MM-DD date format', () => {
    const r = v1UpdateStudentSchema.safeParse({ dateOfBirth: '2000-12-31' });
    expect(r.success).toBe(true);
  });
});

// ─── v1ListGuardiansQuerySchema ───────────────────────────────────────────────

describe('v1ListGuardiansQuerySchema', () => {
  it('accepts valid guardian filter', () => {
    const r = v1ListGuardiansQuerySchema.safeParse({ status: 'active', limit: '10' });
    expect(r.success).toBe(true);
  });

  it('rejects invalid status enum', () => {
    const r = v1ListGuardiansQuerySchema.safeParse({ status: 'deleted' });
    expect(r.success).toBe(false);
  });

  it(`rejects limit > ${MAX_PAGE_SIZE}`, () => {
    const r = v1ListGuardiansQuerySchema.safeParse({ limit: '200' });
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects instituteId injection', () => {
    const r = v1ListGuardiansQuerySchema.safeParse({ instituteId: 'foreign' });
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects role injection', () => {
    const r = v1ListGuardiansQuerySchema.safeParse({ role: 'owner' });
    expect(r.success).toBe(false);
  });
});

// ─── v1ListStaffQuerySchema ───────────────────────────────────────────────────

describe('v1ListStaffQuerySchema', () => {
  it('accepts valid staff filter', () => {
    const r = v1ListStaffQuerySchema.safeParse({ role: 'teacher', status: 'active' });
    expect(r.success).toBe(true);
  });

  it('rejects invalid role enum (e.g. "parent")', () => {
    const r = v1ListStaffQuerySchema.safeParse({ role: 'parent' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid status enum', () => {
    const r = v1ListStaffQuerySchema.safeParse({ status: 'invited' });
    expect(r.success).toBe(false);
  });

  it(`rejects limit > ${MAX_PAGE_SIZE}`, () => {
    const r = v1ListStaffQuerySchema.safeParse({ limit: '500' });
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects instituteId injection', () => {
    const r = v1ListStaffQuerySchema.safeParse({ instituteId: 'injected' });
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects userId injection', () => {
    const r = v1ListStaffQuerySchema.safeParse({ userId: 'uid-123' });
    expect(r.success).toBe(false);
  });
});

// ─── v1ListEnrollmentsQuerySchema ─────────────────────────────────────────────

describe('v1ListEnrollmentsQuerySchema', () => {
  it('accepts valid enrollment filter', () => {
    const r = v1ListEnrollmentsQuerySchema.safeParse({
      studentId: '550e8400-e29b-41d4-a716-446655440000',
      batchId: '550e8400-e29b-41d4-a716-446655440001',
      status: 'active',
    });
    expect(r.success).toBe(true);
  });

  it('rejects invalid studentId (non-UUID)', () => {
    const r = v1ListEnrollmentsQuerySchema.safeParse({ studentId: 'not-a-uuid' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid enrollment status enum', () => {
    const r = v1ListEnrollmentsQuerySchema.safeParse({ status: 'enrolled' });
    expect(r.success).toBe(false);
  });

  it(`rejects limit > ${MAX_PAGE_SIZE}`, () => {
    const r = v1ListEnrollmentsQuerySchema.safeParse({ limit: '999' });
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects instituteId injection', () => {
    const r = v1ListEnrollmentsQuerySchema.safeParse({ instituteId: 'foreign-institute' });
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects tenantId injection', () => {
    const r = v1ListEnrollmentsQuerySchema.safeParse({ tenantId: 'tenant-override' });
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects role injection', () => {
    const r = v1ListEnrollmentsQuerySchema.safeParse({ role: 'owner' });
    expect(r.success).toBe(false);
  });

  it('SECURITY: rejects membershipId injection', () => {
    const r = v1ListEnrollmentsQuerySchema.safeParse({ membershipId: 'mbr-abc' });
    expect(r.success).toBe(false);
  });
});
