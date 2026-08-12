import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  createEnrollmentSchema,
  transferEnrollmentSchema,
  listEnrollmentsQuerySchema,
  enrollmentParamsSchema,
} from './enrollment.validator';

describe('Enrollment Zod Presentation Validators Suite (Phase 1.11.4)', () => {
  describe('createEnrollmentSchema', () => {
    it('validates createEnrollmentSchema with valid UUIDs', () => {
      const valid = {
        studentId: crypto.randomUUID(),
        batchId: crypto.randomUUID(),
        status: 'active',
        enrolledAt: '2026-08-12T10:00:00Z',
      };
      const parsed = createEnrollmentSchema.parse(valid);
      expect(parsed.studentId).toBe(valid.studentId);
      expect(parsed.batchId).toBe(valid.batchId);
      expect(parsed.status).toBe('active');
    });

    it('allows default status and enrolledAt when omitted', () => {
      const valid = {
        studentId: crypto.randomUUID(),
        batchId: crypto.randomUUID(),
      };
      const parsed = createEnrollmentSchema.parse(valid);
      expect(parsed.studentId).toBe(valid.studentId);
      expect(parsed.batchId).toBe(valid.batchId);
      expect(parsed.status).toBeUndefined();
    });

    it('rejects client-injected instituteId or id via .strict()', () => {
      const invalid = {
        studentId: crypto.randomUUID(),
        batchId: crypto.randomUUID(),
        instituteId: crypto.randomUUID(), // Forbidden client injection
      };
      expect(() => createEnrollmentSchema.parse(invalid)).toThrow();
    });

    it('rejects invalid status upon creation (e.g. transferred, completed)', () => {
      const invalid = {
        studentId: crypto.randomUUID(),
        batchId: crypto.randomUUID(),
        status: 'transferred', // Creation cannot be transferred
      };
      expect(() => createEnrollmentSchema.parse(invalid)).toThrow();
    });

    it('rejects invalid UUID format for studentId or batchId', () => {
      const invalid = {
        studentId: 'not-a-uuid',
        batchId: crypto.randomUUID(),
      };
      expect(() => createEnrollmentSchema.parse(invalid)).toThrow();
    });
  });

  describe('transferEnrollmentSchema', () => {
    it('validates transferEnrollmentSchema with valid targetBatchId', () => {
      const valid = {
        targetBatchId: crypto.randomUUID(),
      };
      const parsed = transferEnrollmentSchema.parse(valid);
      expect(parsed.targetBatchId).toBe(valid.targetBatchId);
    });

    it('rejects client-injected source fields via .strict()', () => {
      const invalid = {
        targetBatchId: crypto.randomUUID(),
        status: 'transferred', // Extra forbidden field
      };
      expect(() => transferEnrollmentSchema.parse(invalid)).toThrow();
    });
  });

  describe('listEnrollmentsQuerySchema', () => {
    it('validates listEnrollmentsQuerySchema optional filters', () => {
      const valid = {
        studentId: crypto.randomUUID(),
        status: 'active',
        page: '2',
        limit: '20',
      };
      const parsed = listEnrollmentsQuerySchema.parse(valid);
      expect(parsed.status).toBe('active');
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(20);
    });
  });

  describe('enrollmentParamsSchema', () => {
    it('validates route parameter id with valid UUID', () => {
      const valid = { id: crypto.randomUUID() };
      const parsed = enrollmentParamsSchema.parse(valid);
      expect(parsed.id).toBe(valid.id);
    });

    it('rejects non-UUID route parameter id', () => {
      expect(() => enrollmentParamsSchema.parse({ id: 'invalid-id' })).toThrow();
    });
  });
});
