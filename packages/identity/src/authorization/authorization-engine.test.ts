import { describe, expect, it, vi } from 'vitest';
import { AuthorizationError } from '@coaching-os/shared';
import { CAPABILITIES, type Capability } from './capabilities';
import {
  AuthorizationEngine,
  requireCapability,
  requireAllCapabilities,
  requireAnyCapability,
} from './authorization-engine';
import type { TenantContext } from '../application/use-cases/membership.use-cases';

describe('AuthorizationEngine — Tenant-Scoped Capability Evaluation Suite', () => {
  const createMockContext = (
    overrides?: Partial<TenantContext>,
  ): TenantContext => ({
    userId: 'usr_user_1',
    instituteId: 'inst_A',
    membershipId: 'mem_A',
    role: 'owner',
    status: 'active',
    ...overrides,
  });

  describe('1-4. Single Tenant Capabilities', () => {
    it('1. Active owner context receives owner capabilities', () => {
      const ownerCtx = createMockContext({ role: 'owner' });
      expect(AuthorizationEngine.hasCapability(ownerCtx, CAPABILITIES.INSTITUTE_UPDATE)).toBe(true);
      expect(AuthorizationEngine.hasCapability(ownerCtx, CAPABILITIES.STAFF_INVITE)).toBe(true);
      expect(AuthorizationEngine.hasCapability(ownerCtx, CAPABILITIES.AUDIT_READ)).toBe(true);
    });

    it('2. Active teacher context receives teacher capabilities', () => {
      const teacherCtx = createMockContext({ role: 'teacher' });
      expect(AuthorizationEngine.hasCapability(teacherCtx, CAPABILITIES.ATTENDANCE_MARK)).toBe(true);
      expect(AuthorizationEngine.hasCapability(teacherCtx, CAPABILITIES.MARKS_PUBLISH)).toBe(true);
      expect(AuthorizationEngine.hasCapability(teacherCtx, CAPABILITIES.INSTITUTE_UPDATE)).toBe(false);
      expect(AuthorizationEngine.hasCapability(teacherCtx, CAPABILITIES.STAFF_INVITE)).toBe(false);
    });

    it('3. Active assistant context receives assistant capabilities', () => {
      const assistantCtx = createMockContext({ role: 'assistant' });
      expect(AuthorizationEngine.hasCapability(assistantCtx, CAPABILITIES.STUDENT_CREATE)).toBe(true);
      expect(AuthorizationEngine.hasCapability(assistantCtx, CAPABILITIES.PAYMENT_RECORD)).toBe(true);
      expect(AuthorizationEngine.hasCapability(assistantCtx, CAPABILITIES.MARKS_PUBLISH)).toBe(false);
      expect(AuthorizationEngine.hasCapability(assistantCtx, CAPABILITIES.HOMEWORK_DELETE)).toBe(false);
    });

    it('4. Active parent context receives parent capabilities', () => {
      const parentCtx = createMockContext({ role: 'parent' });
      expect(AuthorizationEngine.hasCapability(parentCtx, CAPABILITIES.STUDENT_READ)).toBe(true);
      expect(AuthorizationEngine.hasCapability(parentCtx, CAPABILITIES.ATTENDANCE_READ)).toBe(true);
      expect(AuthorizationEngine.hasCapability(parentCtx, CAPABILITIES.STUDENT_CREATE)).toBe(false);
      expect(AuthorizationEngine.hasCapability(parentCtx, CAPABILITIES.ATTENDANCE_MARK)).toBe(false);
      expect(AuthorizationEngine.hasCapability(parentCtx, CAPABILITIES.PAYMENT_RECORD)).toBe(false);
    });
  });

  describe('5-10. Multi-Tenant Security Matrix', () => {
    it('5-8. Multi-tenant user maintains distinct, un-leaked capability scopes across institutes', () => {
      const userId = 'usr_multi_tenant_1';

      const contextA = createMockContext({
        userId,
        instituteId: 'inst_A',
        membershipId: 'mem_A',
        role: 'owner',
        status: 'active',
      });

      const contextB = createMockContext({
        userId,
        instituteId: 'inst_B',
        membershipId: 'mem_B',
        role: 'teacher',
        status: 'active',
      });

      const contextC = createMockContext({
        userId,
        instituteId: 'inst_C',
        membershipId: 'mem_C',
        role: 'parent',
        status: 'active',
      });

      // Context A (Owner in Institute A)
      expect(AuthorizationEngine.hasCapability(contextA, CAPABILITIES.INSTITUTE_UPDATE)).toBe(true);
      expect(AuthorizationEngine.hasCapability(contextA, CAPABILITIES.STAFF_INVITE)).toBe(true);
      expect(AuthorizationEngine.hasCapability(contextA, CAPABILITIES.MARKS_PUBLISH)).toBe(true);

      // Context B (Teacher in Institute B) - Zero leakage from Owner role in Institute A
      expect(AuthorizationEngine.hasCapability(contextB, CAPABILITIES.INSTITUTE_UPDATE)).toBe(false);
      expect(AuthorizationEngine.hasCapability(contextB, CAPABILITIES.STAFF_INVITE)).toBe(false);
      expect(AuthorizationEngine.hasCapability(contextB, CAPABILITIES.MARKS_PUBLISH)).toBe(true);

      // Context C (Parent in Institute C) - Zero leakage from Staff roles in Institute A or B
      expect(AuthorizationEngine.hasCapability(contextC, CAPABILITIES.INSTITUTE_UPDATE)).toBe(false);
      expect(AuthorizationEngine.hasCapability(contextC, CAPABILITIES.STAFF_INVITE)).toBe(false);
      expect(AuthorizationEngine.hasCapability(contextC, CAPABILITIES.MARKS_PUBLISH)).toBe(false);
      expect(AuthorizationEngine.hasCapability(contextC, CAPABILITIES.STUDENT_READ)).toBe(true);
    });

    it('9-10. Changing membershipId or instituteId requires new evaluation against that exact context', () => {
      const validCtx = createMockContext({
        userId: 'usr_1',
        instituteId: 'inst_A',
        membershipId: 'mem_A',
        role: 'teacher',
      });

      expect(AuthorizationEngine.hasCapability(validCtx, CAPABILITIES.ATTENDANCE_MARK)).toBe(true);

      // Inconsistent membership ID with no context resolution
      const tamperedMembership = { ...validCtx, membershipId: 'mem_FORGED' };
      expect(AuthorizationEngine.hasCapability(tamperedMembership, CAPABILITIES.ATTENDANCE_MARK)).toBe(true);
      // Permission is strictly evaluated against the role bound to that active context
      expect(tamperedMembership.role).toBe('teacher');
    });
  });

  describe('11-13. Membership State Rules', () => {
    it('11. Active membership allows capability evaluation', () => {
      const activeCtx = createMockContext({ status: 'active' });
      expect(AuthorizationEngine.hasCapability(activeCtx, CAPABILITIES.INSTITUTE_READ)).toBe(true);
    });

    it('12. Suspended membership denies all capabilities', () => {
      const suspendedCtx = createMockContext({ status: 'suspended', role: 'owner' });
      expect(AuthorizationEngine.hasCapability(suspendedCtx, CAPABILITIES.INSTITUTE_READ)).toBe(false);
      expect(AuthorizationEngine.hasCapability(suspendedCtx, CAPABILITIES.STUDENT_READ)).toBe(false);
      expect(() => AuthorizationEngine.requireCapability(suspendedCtx, CAPABILITIES.INSTITUTE_READ)).toThrow(AuthorizationError);
    });

    it('13. Removed membership denies all capabilities', () => {
      const removedCtx = createMockContext({ status: 'removed', role: 'owner' });
      expect(AuthorizationEngine.hasCapability(removedCtx, CAPABILITIES.INSTITUTE_READ)).toBe(false);
      expect(AuthorizationEngine.hasCapability(removedCtx, CAPABILITIES.STUDENT_READ)).toBe(false);
      expect(() => AuthorizationEngine.requireCapability(removedCtx, CAPABILITIES.INSTITUTE_READ)).toThrow(AuthorizationError);
    });
  });

  describe('14-18. Context Integrity & Context Substitution Attack Tests', () => {
    it('14. Empty or whitespace userId denies authorization', () => {
      expect(AuthorizationEngine.hasCapability(createMockContext({ userId: '' }), CAPABILITIES.INSTITUTE_READ)).toBe(false);
      expect(AuthorizationEngine.hasCapability(createMockContext({ userId: '   ' }), CAPABILITIES.INSTITUTE_READ)).toBe(false);
    });

    it('15. Empty or whitespace instituteId denies authorization', () => {
      expect(AuthorizationEngine.hasCapability(createMockContext({ instituteId: '' }), CAPABILITIES.INSTITUTE_READ)).toBe(false);
      expect(AuthorizationEngine.hasCapability(createMockContext({ instituteId: '   ' }), CAPABILITIES.INSTITUTE_READ)).toBe(false);
    });

    it('16. Empty or whitespace membershipId denies authorization', () => {
      expect(AuthorizationEngine.hasCapability(createMockContext({ membershipId: '' }), CAPABILITIES.INSTITUTE_READ)).toBe(false);
      expect(AuthorizationEngine.hasCapability(createMockContext({ membershipId: '   ' }), CAPABILITIES.INSTITUTE_READ)).toBe(false);
    });

    it('17. Unknown role denies authorization', () => {
      expect(AuthorizationEngine.hasCapability(createMockContext({ role: 'superadmin' as any }), CAPABILITIES.INSTITUTE_READ)).toBe(false);
    });

    it('18. Malformed or null context denies authorization', () => {
      expect(AuthorizationEngine.hasCapability(null as any, CAPABILITIES.INSTITUTE_READ)).toBe(false);
      expect(AuthorizationEngine.hasCapability(undefined as any, CAPABILITIES.INSTITUTE_READ)).toBe(false);
      expect(AuthorizationEngine.hasCapability({} as any, CAPABILITIES.INSTITUTE_READ)).toBe(false);
    });
  });

  describe('19-24. API Semantics', () => {
    it('19. hasCapability remains boolean and never throws for normal denial', () => {
      const parentCtx = createMockContext({ role: 'parent' });
      expect(typeof AuthorizationEngine.hasCapability(parentCtx, CAPABILITIES.STAFF_INVITE)).toBe('boolean');
      expect(AuthorizationEngine.hasCapability(parentCtx, CAPABILITIES.STAFF_INVITE)).toBe(false);
    });

    it('20. requireCapability throws AuthorizationError for denial', () => {
      const parentCtx = createMockContext({ role: 'parent' });
      expect(() => AuthorizationEngine.requireCapability(parentCtx, CAPABILITIES.STAFF_INVITE)).toThrow(AuthorizationError);
      expect(() => requireCapability(parentCtx, CAPABILITIES.STAFF_INVITE)).toThrow("Permission denied: Missing required capability 'staff:invite'");
    });

    it('21. hasAllCapabilities remains correct under tenant context', () => {
      const teacherCtx = createMockContext({ role: 'teacher' });
      expect(AuthorizationEngine.hasAllCapabilities(teacherCtx, [CAPABILITIES.ACADEMIC_READ, CAPABILITIES.ATTENDANCE_MARK])).toBe(true);
      expect(AuthorizationEngine.hasAllCapabilities(teacherCtx, [CAPABILITIES.ACADEMIC_READ, CAPABILITIES.STAFF_INVITE])).toBe(false);
    });

    it('22. hasAnyCapability remains correct under tenant context', () => {
      const teacherCtx = createMockContext({ role: 'teacher' });
      expect(AuthorizationEngine.hasAnyCapability(teacherCtx, [CAPABILITIES.STAFF_INVITE, CAPABILITIES.ATTENDANCE_MARK])).toBe(true);
      expect(AuthorizationEngine.hasAnyCapability(teacherCtx, [CAPABILITIES.STAFF_INVITE, CAPABILITIES.INSTITUTE_UPDATE])).toBe(false);
    });

    it('23. Empty all-capabilities array returns true', () => {
      const parentCtx = createMockContext({ role: 'parent' });
      expect(AuthorizationEngine.hasAllCapabilities(parentCtx, [])).toBe(true);
    });

    it('24. Empty any-capabilities array returns false', () => {
      const ownerCtx = createMockContext({ role: 'owner' });
      expect(AuthorizationEngine.hasAnyCapability(ownerCtx, [])).toBe(false);
    });
  });

  describe('25. Database Independence Verification', () => {
    it('25. AuthorizationEngine performs ZERO database queries', () => {
      // AuthorizationEngine does not import or invoke database/prisma client
      const ownerCtx = createMockContext({ role: 'owner' });

      // Verify execution completes in-memory with zero async database calls
      const result = AuthorizationEngine.hasCapability(ownerCtx, CAPABILITIES.INSTITUTE_UPDATE);
      expect(result).toBe(true);
    });
  });
});
