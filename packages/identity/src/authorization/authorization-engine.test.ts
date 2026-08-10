import { describe, expect, it } from 'vitest';
import { AuthorizationError } from '@coaching-os/shared';
import { CAPABILITIES, type Capability } from './capabilities';
import {
  AuthorizationEngine,
  requireCapability,
  requireAllCapabilities,
  requireAnyCapability,
} from './authorization-engine';
import type { TenantContext } from '../application/use-cases/membership.use-cases';

describe('AuthorizationEngine Security & Assertion Suite', () => {
  const createMockContext = (
    overrides?: Partial<TenantContext>,
  ): TenantContext => ({
    userId: 'usr_123',
    instituteId: 'inst_456',
    membershipId: 'mem_789',
    role: 'owner',
    status: 'active',
    ...overrides,
  });

  describe('1-4. Role Capability Boundaries', () => {
    it('1. Owner can perform owner capabilities', () => {
      const ownerCtx = createMockContext({ role: 'owner' });
      expect(AuthorizationEngine.hasCapability(ownerCtx, CAPABILITIES.INSTITUTE_UPDATE)).toBe(true);
      expect(AuthorizationEngine.hasCapability(ownerCtx, CAPABILITIES.STAFF_INVITE)).toBe(true);
      expect(AuthorizationEngine.hasCapability(ownerCtx, CAPABILITIES.AUDIT_READ)).toBe(true);
    });

    it('2. Teacher cannot perform owner-only capabilities', () => {
      const teacherCtx = createMockContext({ role: 'teacher' });
      expect(AuthorizationEngine.hasCapability(teacherCtx, CAPABILITIES.ATTENDANCE_MARK)).toBe(true);
      expect(AuthorizationEngine.hasCapability(teacherCtx, CAPABILITIES.INSTITUTE_UPDATE)).toBe(false);
      expect(AuthorizationEngine.hasCapability(teacherCtx, CAPABILITIES.STAFF_INVITE)).toBe(false);
    });

    it('3. Assistant cannot perform teacher-only capabilities', () => {
      const assistantCtx = createMockContext({ role: 'assistant' });
      expect(AuthorizationEngine.hasCapability(assistantCtx, CAPABILITIES.STUDENT_CREATE)).toBe(true);
      expect(AuthorizationEngine.hasCapability(assistantCtx, CAPABILITIES.MARKS_PUBLISH)).toBe(false);
      expect(AuthorizationEngine.hasCapability(assistantCtx, CAPABILITIES.HOMEWORK_DELETE)).toBe(false);
    });

    it('4. Parent cannot perform mutation capabilities', () => {
      const parentCtx = createMockContext({ role: 'parent' });
      expect(AuthorizationEngine.hasCapability(parentCtx, CAPABILITIES.STUDENT_READ)).toBe(true);
      expect(AuthorizationEngine.hasCapability(parentCtx, CAPABILITIES.STUDENT_CREATE)).toBe(false);
      expect(AuthorizationEngine.hasCapability(parentCtx, CAPABILITIES.ATTENDANCE_MARK)).toBe(false);
      expect(AuthorizationEngine.hasCapability(parentCtx, CAPABILITIES.PAYMENT_RECORD)).toBe(false);
    });
  });

  describe('5-8. Defensive Context & Isolation Validation', () => {
    it('5. Unknown role denies everything', () => {
      const unknownCtx = createMockContext({ role: 'superadmin' as any });
      expect(AuthorizationEngine.hasCapability(unknownCtx, CAPABILITIES.INSTITUTE_READ)).toBe(false);
    });

    it('6. Missing, malformed, or suspended role/status denies everything', () => {
      expect(AuthorizationEngine.hasCapability(null as any, CAPABILITIES.INSTITUTE_READ)).toBe(false);
      expect(AuthorizationEngine.hasCapability(undefined as any, CAPABILITIES.INSTITUTE_READ)).toBe(false);

      const emptyRoleCtx = createMockContext({ role: '' as any });
      expect(AuthorizationEngine.hasCapability(emptyRoleCtx, CAPABILITIES.INSTITUTE_READ)).toBe(false);

      const suspendedCtx = createMockContext({ status: 'suspended' });
      expect(AuthorizationEngine.hasCapability(suspendedCtx, CAPABILITIES.INSTITUTE_READ)).toBe(false);

      const removedCtx = createMockContext({ status: 'removed' });
      expect(AuthorizationEngine.hasCapability(removedCtx, CAPABILITIES.INSTITUTE_READ)).toBe(false);

      const emptyUserIdCtx = createMockContext({ userId: '' });
      expect(AuthorizationEngine.hasCapability(emptyUserIdCtx, CAPABILITIES.INSTITUTE_READ)).toBe(false);

      const emptyInstituteIdCtx = createMockContext({ instituteId: '' });
      expect(AuthorizationEngine.hasCapability(emptyInstituteIdCtx, CAPABILITIES.INSTITUTE_READ)).toBe(false);
    });

    it('7. Tenant A context cannot gain permissions from Tenant B', () => {
      const tenantA = createMockContext({ instituteId: 'inst_A', role: 'parent' });
      const tenantB = createMockContext({ instituteId: 'inst_B', role: 'owner' });

      expect(AuthorizationEngine.hasCapability(tenantA, CAPABILITIES.INSTITUTE_UPDATE)).toBe(false);
      expect(AuthorizationEngine.hasCapability(tenantB, CAPABILITIES.INSTITUTE_UPDATE)).toBe(true);
    });

    it('8. Capability checks are based ONLY on context.role + canonical resolver', () => {
      const ctx = createMockContext({ role: 'teacher' });
      const caps = AuthorizationEngine.getCapabilitiesForRole(ctx.role);

      expect(caps.has(CAPABILITIES.MARKS_PUBLISH)).toBe(true);
      expect(AuthorizationEngine.hasCapability(ctx, CAPABILITIES.MARKS_PUBLISH)).toBe(true);
    });
  });

  describe('9-12. Multi-Capability Combinators', () => {
    it('9. hasAllCapabilities requires EVERY capability', () => {
      const teacherCtx = createMockContext({ role: 'teacher' });
      const validCaps: Capability[] = [CAPABILITIES.ACADEMIC_READ, CAPABILITIES.ATTENDANCE_MARK];
      const mixedCaps: Capability[] = [CAPABILITIES.ACADEMIC_READ, CAPABILITIES.STAFF_INVITE];

      expect(AuthorizationEngine.hasAllCapabilities(teacherCtx, validCaps)).toBe(true);
      expect(AuthorizationEngine.hasAllCapabilities(teacherCtx, mixedCaps)).toBe(false);
    });

    it('10. hasAnyCapability requires AT LEAST ONE capability', () => {
      const teacherCtx = createMockContext({ role: 'teacher' });
      const validAny: Capability[] = [CAPABILITIES.STAFF_INVITE, CAPABILITIES.ATTENDANCE_MARK];
      const invalidAny: Capability[] = [CAPABILITIES.STAFF_INVITE, CAPABILITIES.INSTITUTE_UPDATE];

      expect(AuthorizationEngine.hasAnyCapability(teacherCtx, validAny)).toBe(true);
      expect(AuthorizationEngine.hasAnyCapability(teacherCtx, invalidAny)).toBe(false);
    });

    it('11. Empty hasAllCapabilities returns true', () => {
      const ctx = createMockContext({ role: 'parent' });
      expect(AuthorizationEngine.hasAllCapabilities(ctx, [])).toBe(true);
    });

    it('12. Empty hasAnyCapability returns false', () => {
      const ctx = createMockContext({ role: 'owner' });
      expect(AuthorizationEngine.hasAnyCapability(ctx, [])).toBe(false);
    });
  });

  describe('13-17. Assertion Guards & Error Payload Integrity', () => {
    it('13. requireCapability succeeds for authorized capability', () => {
      const ownerCtx = createMockContext({ role: 'owner' });
      expect(() => AuthorizationEngine.requireCapability(ownerCtx, CAPABILITIES.INSTITUTE_UPDATE)).not.toThrow();
      expect(() => requireCapability(ownerCtx, CAPABILITIES.INSTITUTE_UPDATE)).not.toThrow();
    });

    it('14-15. requireCapability throws AuthorizationError with capability name for denied capability', () => {
      const parentCtx = createMockContext({ role: 'parent' });
      expect(() =>
        AuthorizationEngine.requireCapability(parentCtx, CAPABILITIES.STAFF_INVITE),
      ).toThrow(AuthorizationError);

      try {
        requireCapability(parentCtx, CAPABILITIES.STAFF_INVITE);
      } catch (err: any) {
        expect(err).toBeInstanceOf(AuthorizationError);
        expect(err.message).toBe("Permission denied: Missing required capability 'staff:invite'");
        expect(err.statusCode).toBe(403);
      }
    });

    it('16. requireAllCapabilities fails when any capability is missing', () => {
      const teacherCtx = createMockContext({ role: 'teacher' });
      const caps: Capability[] = [CAPABILITIES.ATTENDANCE_MARK, CAPABILITIES.STAFF_INVITE];

      expect(() =>
        requireAllCapabilities(teacherCtx, caps),
      ).toThrow(AuthorizationError);
    });

    it('17. requireAnyCapability fails when all capabilities are missing', () => {
      const parentCtx = createMockContext({ role: 'parent' });
      const caps: Capability[] = [CAPABILITIES.STAFF_INVITE, CAPABILITIES.INSTITUTE_UPDATE];

      expect(() =>
        requireAnyCapability(parentCtx, caps),
      ).toThrow(AuthorizationError);
    });
  });

  describe('18. Capability Set Immutability Isolation', () => {
    it('18. No mutation of returned capability sets can alter authorization decisions', () => {
      const teacherCtx = createMockContext({ role: 'teacher' });
      const caps = AuthorizationEngine.getCapabilitiesForRole(teacherCtx.role);

      (caps as Set<Capability>).clear();
      expect(caps.size).toBe(0);

      expect(AuthorizationEngine.hasCapability(teacherCtx, CAPABILITIES.ATTENDANCE_MARK)).toBe(true);
    });
  });
});
