import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createProgramSchema, updateProgramSchema, listProgramsQuerySchema } from './program.validator';
import { createSubjectSchema, updateSubjectSchema, listSubjectsQuerySchema } from './subject.validator';
import { createProgramSubjectSchema } from './program-subject.validator';
import { createBatchSchema, updateBatchSchema, assignBatchTeacherSchema, changeBatchStatusSchema } from './batch.validator';

describe('Academic Hierarchy Zod Validators Suite', () => {
  describe('Program Validators', () => {
    it('validates createProgramSchema successfully', () => {
      const valid = {
        name: 'JEE Mains 2027',
        code: 'JEE-2027',
        description: 'Comprehensive entrance coaching',
      };
      const parsed = createProgramSchema.parse(valid);
      expect(parsed.name).toBe('JEE Mains 2027');
      expect(parsed.code).toBe('JEE-2027');
    });

    it('rejects extra forbidden fields (e.g. status, instituteId)', () => {
      const invalid = {
        name: 'JEE Mains 2027',
        code: 'JEE-2027',
        status: 'active', // forbidden field
      };
      expect(() => createProgramSchema.parse(invalid)).toThrow();
    });

    it('rejects invalid code characters', () => {
      const invalid = {
        name: 'JEE Mains 2027',
        code: 'JEE 2027!', // space and exclamation forbidden
      };
      expect(() => createProgramSchema.parse(invalid)).toThrow();
    });

    it('validates updateProgramSchema requiring at least one field', () => {
      expect(() => updateProgramSchema.parse({})).toThrow();
      expect(updateProgramSchema.parse({ name: 'New Name' }).name).toBe('New Name');
    });
  });

  describe('Subject Validators', () => {
    it('validates createSubjectSchema successfully', () => {
      const valid = {
        name: 'Physics',
        code: 'PHY-101',
      };
      const parsed = createSubjectSchema.parse(valid);
      expect(parsed.name).toBe('Physics');
      expect(parsed.code).toBe('PHY-101');
    });

    it('rejects extra forbidden fields', () => {
      const invalid = {
        name: 'Physics',
        code: 'PHY-101',
        instituteId: crypto.randomUUID(), // forbidden field
      };
      expect(() => createSubjectSchema.parse(invalid)).toThrow();
    });
  });

  describe('ProgramSubject Validators', () => {
    it('validates createProgramSubjectSchema with valid UUIDs', () => {
      const valid = {
        programId: crypto.randomUUID(),
        subjectId: crypto.randomUUID(),
      };
      const parsed = createProgramSubjectSchema.parse(valid);
      expect(parsed.programId).toBe(valid.programId);
    });

    it('rejects non-UUID formats', () => {
      const invalid = {
        programId: 'not-a-uuid',
        subjectId: crypto.randomUUID(),
      };
      expect(() => createProgramSubjectSchema.parse(invalid)).toThrow();
    });
  });

  describe('Batch Validators', () => {
    it('validates createBatchSchema successfully', () => {
      const valid = {
        subjectId: crypto.randomUUID(),
        name: 'Morning Batch 1',
        code: 'PHY-M1',
        capacity: 40,
        startDate: '2026-09-01',
      };
      const parsed = createBatchSchema.parse(valid);
      expect(parsed.name).toBe('Morning Batch 1');
      expect(parsed.capacity).toBe(40);
    });

    it('rejects Phase 1.11 student/enrollment field injection', () => {
      const invalid = {
        subjectId: crypto.randomUUID(),
        name: 'Morning Batch 1',
        code: 'PHY-M1',
        studentId: crypto.randomUUID(), // Forbidden boundary violation!
      };
      expect(() => createBatchSchema.parse(invalid)).toThrow();
    });

    it('validates assignBatchTeacherSchema', () => {
      const validUuid = crypto.randomUUID();
      expect(assignBatchTeacherSchema.parse({ teacherId: validUuid }).teacherId).toBe(validUuid);
      expect(assignBatchTeacherSchema.parse({ teacherId: null }).teacherId).toBeNull();
    });

    it('validates changeBatchStatusSchema', () => {
      expect(changeBatchStatusSchema.parse({ status: 'open' }).status).toBe('open');
      expect(() => changeBatchStatusSchema.parse({ status: 'invalid_status' })).toThrow();
    });
  });
});
