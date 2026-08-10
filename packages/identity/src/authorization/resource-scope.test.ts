import { describe, expect, it } from 'vitest';
import { AuthorizationError } from '@coaching-os/shared';
import { CAPABILITIES } from './capabilities';
import {
  canParentAccessStudent,
  filterStudentsForParent,
  canTeacherAccessBatch,
  canTeacherAccessStudent,
  canAccessStudent,
  requireStudentAccess,
  type StudentScopeRecord,
  type StudentBatchScopeRecord,
  type TeacherResourceScope,
} from './resource-scope';
import type { TenantContext } from '../application/use-cases/membership.use-cases';

describe('Resource-Scoped Filtering Helpers Suite', () => {
  const createMockContext = (
    overrides?: Partial<TenantContext>,
  ): TenantContext => ({
    userId: 'usr_100',
    instituteId: 'inst_A',
    membershipId: 'mem_100',
    role: 'parent',
    status: 'active',
    ...overrides,
  });

  describe('1-10. Parent Resource Scope Tests', () => {
    const parentContext = createMockContext({ role: 'parent', instituteId: 'inst_A' });
    const studentA: StudentScopeRecord = { id: 'std_A', instituteId: 'inst_A' };
    const studentB: StudentScopeRecord = { id: 'std_B', instituteId: 'inst_A' };
    const studentForeign: StudentScopeRecord = { id: 'std_F', instituteId: 'inst_B' };

    it('1. Active parent + linked child -> allowed', () => {
      expect(canParentAccessStudent(parentContext, studentA, ['std_A', 'std_X'])).toBe(true);
    });

    it('2. Active parent + unrelated student -> denied', () => {
      expect(canParentAccessStudent(parentContext, studentB, ['std_A'])).toBe(false);
    });

    it('3. Parent with multiple children -> all linked children allowed', () => {
      const linked = ['std_A', 'std_B'];
      expect(canParentAccessStudent(parentContext, studentA, linked)).toBe(true);
      expect(canParentAccessStudent(parentContext, studentB, linked)).toBe(true);
    });

    it('4. Empty linked-child set -> denied', () => {
      expect(canParentAccessStudent(parentContext, studentA, [])).toBe(false);
    });

    it('5. Unknown student -> denied', () => {
      expect(canParentAccessStudent(parentContext, { id: 'std_UNKNOWN', instituteId: 'inst_A' }, ['std_A'])).toBe(false);
    });

    it('6. Non-parent context -> denied for canParentAccessStudent', () => {
      const teacherCtx = createMockContext({ role: 'teacher' });
      expect(canParentAccessStudent(teacherCtx, studentA, ['std_A'])).toBe(false);
    });

    it('7. Suspended parent context -> denied', () => {
      const suspendedParent = createMockContext({ role: 'parent', status: 'suspended' });
      expect(canParentAccessStudent(suspendedParent, studentA, ['std_A'])).toBe(false);
    });

    it('8. Student from another institute -> denied', () => {
      expect(canParentAccessStudent(parentContext, studentForeign, ['std_F'])).toBe(false);
    });

    it('9. Client "isMyChild=true" payload attempt cannot bypass linked student check', () => {
      const forgedStudent = { ...studentB, isMyChild: true } as any;
      expect(canParentAccessStudent(parentContext, forgedStudent, ['std_A'])).toBe(false);
    });

    it('10. Input arrays are not mutated by filterStudentsForParent', () => {
      const list: StudentScopeRecord[] = [studentA, studentB];
      const frozenList = Object.freeze([...list]);

      const filtered = filterStudentsForParent(parentContext, frozenList, ['std_A']);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('std_A');
      expect(frozenList).toHaveLength(2);
    });
  });

  describe('11-20. Teacher Resource Scope Tests', () => {
    const teacherContext = createMockContext({ role: 'teacher', instituteId: 'inst_A' });
    const teacherScope: TeacherResourceScope = { batchIds: ['batch_P1', 'batch_P2'] };

    const batchP1 = { id: 'batch_P1', instituteId: 'inst_A' };
    const batchUnassigned = { id: 'batch_X9', instituteId: 'inst_A' };

    const studentInP1: StudentBatchScopeRecord = {
      id: 'std_1',
      instituteId: 'inst_A',
      batchIds: ['batch_P1'],
    };

    const studentInUnassigned: StudentBatchScopeRecord = {
      id: 'std_2',
      instituteId: 'inst_A',
      batchIds: ['batch_X9'],
    };

    const studentMultiBatch: StudentBatchScopeRecord = {
      id: 'std_3',
      instituteId: 'inst_A',
      batchIds: ['batch_X9', 'batch_P2'],
    };

    it('11. Active teacher + assigned batch -> allowed', () => {
      expect(canTeacherAccessBatch(teacherContext, batchP1, teacherScope)).toBe(true);
    });

    it('12. Active teacher + unassigned batch -> denied', () => {
      expect(canTeacherAccessBatch(teacherContext, batchUnassigned, teacherScope)).toBe(false);
    });

    it('13. Empty assignment scope -> denied', () => {
      expect(canTeacherAccessBatch(teacherContext, batchP1, { batchIds: [] })).toBe(false);
    });

    it('14. Teacher from Institute A cannot access Batch from Institute B', () => {
      const batchInstB = { id: 'batch_P1', instituteId: 'inst_B' };
      expect(canTeacherAccessBatch(teacherContext, batchInstB, teacherScope)).toBe(false);
    });

    it('15. Teacher cannot access another teacher assigned batch', () => {
      const otherTeacherScope: TeacherResourceScope = { batchIds: ['batch_OTHER'] };
      expect(canTeacherAccessBatch(teacherContext, batchP1, otherTeacherScope)).toBe(false);
    });

    it('16. Student enrolled in teacher assigned batch -> allowed', () => {
      expect(canTeacherAccessStudent(teacherContext, studentInP1, teacherScope)).toBe(true);
    });

    it('17. Student enrolled only in unrelated batch -> denied', () => {
      expect(canTeacherAccessStudent(teacherContext, studentInUnassigned, teacherScope)).toBe(false);
    });

    it('18. Student enrolled in both assigned and unrelated batches -> allowed', () => {
      expect(canTeacherAccessStudent(teacherContext, studentMultiBatch, teacherScope)).toBe(true);
    });

    it('19. Suspended teacher context -> denied', () => {
      const suspendedTeacher = createMockContext({ role: 'teacher', status: 'suspended' });
      expect(canTeacherAccessStudent(suspendedTeacher, studentInP1, teacherScope)).toBe(false);
    });

    it('20. Non-teacher context -> denied for canTeacherAccessStudent', () => {
      const parentCtx = createMockContext({ role: 'parent' });
      expect(canTeacherAccessStudent(parentCtx, studentInP1, teacherScope)).toBe(false);
    });
  });

  describe('21-25. Capability + Resource Scope Interaction', () => {
    const parentCtx = createMockContext({ role: 'parent', instituteId: 'inst_A' });
    const teacherCtx = createMockContext({ role: 'teacher', instituteId: 'inst_A' });

    const student: StudentBatchScopeRecord = {
      id: 'std_100',
      instituteId: 'inst_A',
      batchIds: ['batch_P1'],
    };

    const parentScope = { linkedStudentIds: ['std_100'] };
    const teacherScope = { batchIds: ['batch_P1'] };

    it('21. Parent linked student + student:read -> allowed', () => {
      expect(canAccessStudent(parentCtx, student, CAPABILITIES.STUDENT_READ, parentScope)).toBe(true);
    });

    it('22. Parent linked student + student:create -> denied', () => {
      expect(canAccessStudent(parentCtx, student, CAPABILITIES.STUDENT_CREATE, parentScope)).toBe(false);
    });

    it('23. Teacher assigned student + student:read -> allowed', () => {
      expect(canAccessStudent(teacherCtx, student, CAPABILITIES.STUDENT_READ, undefined, teacherScope)).toBe(true);
    });

    it('24. Teacher assigned student + capability they do not possess -> denied', () => {
      expect(canAccessStudent(teacherCtx, student, CAPABILITIES.BILLING_READ, undefined, teacherScope)).toBe(false);
    });

    it('25. Resource scope cannot bypass AuthorizationEngine', () => {
      // Even if teacher is assigned to student, requesting an ungranted capability returns false
      expect(canAccessStudent(teacherCtx, student, CAPABILITIES.STAFF_INVITE, undefined, teacherScope)).toBe(false);

      expect(() =>
        requireStudentAccess(teacherCtx, student, CAPABILITIES.STAFF_INVITE, undefined, teacherScope),
      ).toThrow(AuthorizationError);
    });
  });

  describe('26-30. Isolation, Integrity & Pure Function Tests', () => {
    const ownerCtx = createMockContext({ role: 'owner', instituteId: 'inst_A' });
    const student: StudentBatchScopeRecord = {
      id: 'std_100',
      instituteId: 'inst_A',
      batchIds: ['batch_1'],
    };

    it('26. Different instituteId -> denied', () => {
      const foreignStudent = { ...student, instituteId: 'inst_FOREIGN' };
      expect(canAccessStudent(ownerCtx, foreignStudent, CAPABILITIES.STUDENT_READ)).toBe(false);
    });

    it('27. Empty resource ID -> denied', () => {
      const emptyStudent = { ...student, id: '' };
      expect(canParentAccessStudent(createMockContext({ role: 'parent' }), emptyStudent, ['std_100'])).toBe(false);
    });

    it('28. Empty instituteId in context -> denied', () => {
      const emptyInstCtx = createMockContext({ instituteId: '' });
      expect(canAccessStudent(emptyInstCtx, student, CAPABILITIES.STUDENT_READ)).toBe(false);
    });

    it('29. Malformed context -> denied', () => {
      expect(canAccessStudent(null as any, student, CAPABILITIES.STUDENT_READ)).toBe(false);
    });

    it('30. No database calls occur inside resource-scope helpers', () => {
      // Pure in-memory execution completes synchronously without async database lookups
      const result = canAccessStudent(ownerCtx, student, CAPABILITIES.STUDENT_READ);
      expect(result).toBe(true);
    });
  });
});
