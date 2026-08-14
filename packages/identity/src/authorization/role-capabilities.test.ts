import { describe, expect, it } from 'vitest';
import { CAPABILITIES, isCapability, type Capability } from './capabilities';
import {
  ROLE_CAPABILITIES,
  getCapabilitiesForRole,
  roleHasCapability,
} from './role-capabilities';
import type { MembershipRole } from '../domain/entities/institute-membership.entity';

describe('Role → Capability Resolver Engine Suite', () => {
  describe('Matrix Completeness & Immutability', () => {
    it('contains an explicit entry for every canonical MembershipRole', () => {
      const roles: MembershipRole[] = ['owner', 'teacher', 'assistant', 'parent'];
      expect(Object.keys(ROLE_CAPABILITIES).sort()).toEqual(roles.sort());
    });

    it('contains no duplicate capabilities within any role mapping', () => {
      for (const [role, caps] of Object.entries(ROLE_CAPABILITIES)) {
        const set = new Set(caps);
        expect(set.size).toBe(caps.length);
      }
    });

    it('ensures every mapped capability exists in the canonical CAPABILITIES registry', () => {
      for (const [role, caps] of Object.entries(ROLE_CAPABILITIES)) {
        for (const cap of caps) {
          expect(isCapability(cap)).toBe(true);
        }
      }
    });
  });

  describe('Explicit Role Capability Sets (Matrix Tests)', () => {
    it('Test 1 — Owner capabilities (All 63 capabilities)', () => {
      const ownerCaps = getCapabilitiesForRole('owner');
      const allCaps = Object.values(CAPABILITIES);

      expect(ownerCaps.size).toBe(allCaps.length);
      for (const cap of allCaps) {
        expect(ownerCaps.has(cap as Capability)).toBe(true);
      }
    });

    it('Test 2 — Teacher capabilities (Exact 40 capabilities)', () => {
      const teacherCaps = getCapabilitiesForRole('teacher');
      expect(teacherCaps.size).toBe(40);

      // Teacher possesses academic, attendance, homework, test, marks, announcement, institute:read, parent CRM (read, create, update), guardian:read
      expect(teacherCaps.has(CAPABILITIES.INSTITUTE_READ)).toBe(true);
      expect(teacherCaps.has(CAPABILITIES.MARKS_PUBLISH)).toBe(true);
      expect(teacherCaps.has(CAPABILITIES.ATTENDANCE_MARK)).toBe(true);
      expect(teacherCaps.has(CAPABILITIES.PARENT_READ)).toBe(true);
      expect(teacherCaps.has(CAPABILITIES.PARENT_CREATE)).toBe(true);
      expect(teacherCaps.has(CAPABILITIES.PARENT_UPDATE)).toBe(true);
      expect(teacherCaps.has(CAPABILITIES.GUARDIAN_READ)).toBe(true);

      // Teacher MUST NOT possess staff management, guardian create/update/archive or billing capabilities
      expect(teacherCaps.has(CAPABILITIES.STAFF_INVITE)).toBe(false);
      expect(teacherCaps.has(CAPABILITIES.GUARDIAN_CREATE)).toBe(false);
      expect(teacherCaps.has(CAPABILITIES.GUARDIAN_UPDATE)).toBe(false);
      expect(teacherCaps.has(CAPABILITIES.BILLING_READ)).toBe(false);
      expect(teacherCaps.has(CAPABILITIES.INSTITUTE_UPDATE)).toBe(false);
    });

    it('Test 3 — Assistant capabilities (Exact 39 capabilities)', () => {
      const assistantCaps = getCapabilitiesForRole('assistant');
      expect(assistantCaps.size).toBe(39);

      // Assistant possesses staff:read, student:create, payment:record, receipt:issue, parent:read, guardian (read, create, update, primary)
      expect(assistantCaps.has(CAPABILITIES.STAFF_READ)).toBe(true);
      expect(assistantCaps.has(CAPABILITIES.STUDENT_CREATE)).toBe(true);
      expect(assistantCaps.has(CAPABILITIES.PAYMENT_RECORD)).toBe(true);
      expect(assistantCaps.has(CAPABILITIES.PARENT_READ)).toBe(true);
      expect(assistantCaps.has(CAPABILITIES.GUARDIAN_READ)).toBe(true);
      expect(assistantCaps.has(CAPABILITIES.GUARDIAN_CREATE)).toBe(true);
      expect(assistantCaps.has(CAPABILITIES.GUARDIAN_UPDATE)).toBe(true);
      expect(assistantCaps.has(CAPABILITIES.GUARDIAN_PRIMARY)).toBe(true);

      // Assistant MUST NOT possess marks publishing, staff role change, or guardian:archive
      expect(assistantCaps.has(CAPABILITIES.MARKS_PUBLISH)).toBe(false);
      expect(assistantCaps.has(CAPABILITIES.STAFF_ROLE_CHANGE)).toBe(false);
      expect(assistantCaps.has(CAPABILITIES.INSTITUTE_ARCHIVE)).toBe(false);
      expect(assistantCaps.has(CAPABILITIES.PARENT_CREATE)).toBe(false);
      expect(assistantCaps.has(CAPABILITIES.GUARDIAN_ARCHIVE)).toBe(false);
    });

    it('Test 4 — Parent capabilities (Exact 14 capabilities)', () => {
      const parentCaps = getCapabilitiesForRole('parent');
      expect(parentCaps.size).toBe(14);

      const expectedParentCaps: Capability[] = [
        CAPABILITIES.STUDENT_READ,
        CAPABILITIES.ACADEMIC_READ,
        CAPABILITIES.ATTENDANCE_READ,
        CAPABILITIES.HOMEWORK_READ,
        CAPABILITIES.TEST_READ,
        CAPABILITIES.MARKS_READ,
        CAPABILITIES.BILLING_READ,
        CAPABILITIES.PAYMENT_READ,
        CAPABILITIES.RECEIPT_READ,
        CAPABILITIES.ANNOUNCEMENT_READ,
        CAPABILITIES.NOTIFICATION_READ,
        CAPABILITIES.PROGRAM_READ,
        CAPABILITIES.SUBJECT_READ,
        CAPABILITIES.BATCH_READ,
      ];

      for (const cap of expectedParentCaps) {
        expect(parentCaps.has(cap)).toBe(true);
      }

      // Parent MUST NOT possess any create/update/delete capabilities
      expect(parentCaps.has(CAPABILITIES.ATTENDANCE_MARK)).toBe(false);
      expect(parentCaps.has(CAPABILITIES.HOMEWORK_CREATE)).toBe(false);
      expect(parentCaps.has(CAPABILITIES.PAYMENT_RECORD)).toBe(false);
    });
  });

  describe('Security & Isolation Guards', () => {
    it('Test 5 — No implicit role inheritance', () => {
      const teacherCaps = getCapabilitiesForRole('teacher');
      const assistantCaps = getCapabilitiesForRole('assistant');

      // Assistant has STAFF_READ, Teacher does not
      expect(assistantCaps.has(CAPABILITIES.STAFF_READ)).toBe(true);
      expect(teacherCaps.has(CAPABILITIES.STAFF_READ)).toBe(false);

      // Teacher has MARKS_PUBLISH, Assistant does not
      expect(teacherCaps.has(CAPABILITIES.MARKS_PUBLISH)).toBe(true);
      expect(assistantCaps.has(CAPABILITIES.MARKS_PUBLISH)).toBe(false);
    });

    it('Test 6 — Returned Set isolation (mutating returned Set does not alter future calls)', () => {
      const first = getCapabilitiesForRole('teacher');
      (first as Set<Capability>).clear();
      expect(first.size).toBe(0);

      const second = getCapabilitiesForRole('teacher');
      expect(second.size).toBe(40);
      expect(second.has(CAPABILITIES.ATTENDANCE_MARK)).toBe(true);
    });

    it('Test 7 — Matrix immutability', () => {
      expect(Object.isFrozen(ROLE_CAPABILITIES)).toBe(true);
      expect(Object.isFrozen(ROLE_CAPABILITIES.owner)).toBe(true);
      expect(Object.isFrozen(ROLE_CAPABILITIES.teacher)).toBe(true);
      expect(Object.isFrozen(ROLE_CAPABILITIES.assistant)).toBe(true);
      expect(Object.isFrozen(ROLE_CAPABILITIES.parent)).toBe(true);
    });

    it('Test 8 — Unknown or invalid role input returns empty capability set and false', () => {
      const unknownSet = getCapabilitiesForRole('superadmin');
      expect(unknownSet.size).toBe(0);

      expect(roleHasCapability('superadmin', CAPABILITIES.INSTITUTE_READ)).toBe(false);
      expect(roleHasCapability('', CAPABILITIES.INSTITUTE_READ)).toBe(false);
      expect(roleHasCapability(null as any, CAPABILITIES.INSTITUTE_READ)).toBe(false);
      expect(roleHasCapability(undefined as any, CAPABILITIES.INSTITUTE_READ)).toBe(false);
    });
  });
});
