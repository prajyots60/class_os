import { describe, expect, it, vi } from 'vitest';
import { AuthorizationError } from '@coaching-os/shared';
import { CAPABILITIES, isCapability, isCapabilityAction, isCapabilityResource, type Capability } from './capabilities';
import { ROLE_CAPABILITIES, getCapabilitiesForRole, roleHasCapability } from './role-capabilities';
import { AuthorizationEngine } from './authorization-engine';
import {
  canParentAccessStudent,
  canTeacherAccessBatch,
  canTeacherAccessStudent,
  canAccessStudent,
  requireStudentAccess,
  type StudentBatchScopeRecord,
  type TeacherResourceScope,
} from './resource-scope';
import type { TenantContext } from '../application/use-cases/membership.use-cases';
import type { MembershipRole } from '../domain/entities/institute-membership.entity';
import {
  GetInstituteUseCase,
  UpdateInstituteUseCase,
  ChangeInstituteStatusUseCase,
} from '../application/use-cases/institute.use-cases';
import {
  CreateInstituteMembershipUseCase,
  GetInstituteMembersUseCase,
  GetInstituteMembershipUseCase,
  GetUserMembershipsUseCase,
  UpdateMembershipRoleUseCase,
  ChangeMembershipStatusUseCase,
} from '../application/use-cases/membership.use-cases';
import type { InstituteRepository } from '../domain/repositories/institute.repository';
import type { InstituteMembershipRepository } from '../domain/repositories/institute-membership.repository';

describe('Phase 1.3.7 — Security & RBAC Test Matrix', () => {
  const mockInstituteRepo: InstituteRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
  };

  const mockMembershipRepo: InstituteMembershipRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserAndInstitute: vi.fn(),
    findByUserId: vi.fn(),
    findByInstituteId: vi.fn(),
    updateStatus: vi.fn(),
    updateRole: vi.fn(),
    delete: vi.fn(),
  };

  const createTenantContext = (role: MembershipRole, overrides?: Partial<TenantContext>): TenantContext => ({
    userId: `usr_${role}`,
    instituteId: 'inst_alpha',
    membershipId: `mem_${role}`,
    role,
    status: 'active',
    ...overrides,
  });

  describe('1. Contract Consistency & Registry Audit', () => {
    it('audit: all capabilities follow resource:action format', () => {
      const capabilityValues = Object.values(CAPABILITIES);
      expect(capabilityValues.length).toBeGreaterThanOrEqual(53);

      for (const cap of capabilityValues) {
        expect(isCapability(cap)).toBe(true);
        expect(cap).toMatch(/^[a-z]+:[a-z_]+$/);

        const [resource, action] = cap.split(':');
        expect(isCapabilityResource(resource)).toBe(true);
        expect(isCapabilityAction(action)).toBe(true);
      }
    });

    it('audit: ROLE_CAPABILITIES mappings are closed over CAPABILITIES', () => {
      const allCapabilitySet = new Set<string>(Object.values(CAPABILITIES));
      const roles: MembershipRole[] = ['owner', 'teacher', 'assistant', 'parent'];

      for (const role of roles) {
        const capabilities = ROLE_CAPABILITIES[role];
        expect(capabilities).toBeDefined();

        for (const cap of capabilities) {
          expect(allCapabilitySet.has(cap)).toBe(true);
        }
      }
    });

    it('audit: exact capability count invariants per role', () => {
      expect(ROLE_CAPABILITIES.owner.length).toBe(83);
      expect(ROLE_CAPABILITIES.teacher.length).toBe(38);
      expect(ROLE_CAPABILITIES.assistant.length).toBe(37);
      expect(ROLE_CAPABILITIES.parent.length).toBe(13);
    });
  });

  describe('2. Deterministic Role Matrix Parameterized Tests', () => {
    const roles: MembershipRole[] = ['owner', 'teacher', 'assistant', 'parent'];
    const allCaps = Object.values(CAPABILITIES);

    roles.forEach((role) => {
      it(`evaluates all capabilities deterministically for role '${role}'`, () => {
        const expectedCaps = new Set(ROLE_CAPABILITIES[role]);
        const ctx = createTenantContext(role);

        for (const cap of allCaps) {
          const expected = expectedCaps.has(cap);

          expect(roleHasCapability(role, cap)).toBe(expected);
          expect(getCapabilitiesForRole(role).has(cap)).toBe(expected);
          expect(AuthorizationEngine.hasCapability(ctx, cap)).toBe(expected);
        }
      });
    });
  });

  describe('3. Tenant Isolation & Context Forgery Defense', () => {
    it('context substitution attack: switching instituteId without membership rejects authorization', async () => {
      const ownerCtx = createTenantContext('owner', { instituteId: 'inst_victim' });
      const getInstitute = new GetInstituteUseCase(mockInstituteRepo);

      vi.spyOn(mockInstituteRepo, 'findById').mockResolvedValueOnce({
        id: 'inst_target',
        name: 'Target Inst',
        slug: 'target-inst',
      } as any);

      expect(() =>
        AuthorizationEngine.requireCapability(ownerCtx, CAPABILITIES.INSTITUTE_UPDATE),
      ).not.toThrow();

      // Attempting to access inst_target with inst_victim context fails tenant scoping
      await expect(
        getInstitute.execute({ id: 'inst_target', tenantContext: ownerCtx }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('context forgery: empty or whitespace context fields fail fail-closed', () => {
      const badCtx1 = createTenantContext('owner', { userId: '' });
      const badCtx2 = createTenantContext('owner', { instituteId: '   ' });
      const badCtx3 = createTenantContext('owner', { role: 'hacker' as any });

      expect(AuthorizationEngine.hasCapability(badCtx1, CAPABILITIES.INSTITUTE_READ)).toBe(false);
      expect(AuthorizationEngine.hasCapability(badCtx2, CAPABILITIES.INSTITUTE_READ)).toBe(false);
      expect(AuthorizationEngine.hasCapability(badCtx3, CAPABILITIES.INSTITUTE_READ)).toBe(false);
    });
  });

  describe('4. Cross-Tenant Resource Attack Prevention', () => {
    it('rejects cross-tenant UpdateInstitute command BEFORE calling repository', async () => {
      const ownerCtx = createTenantContext('owner', { instituteId: 'inst_A' });
      const spyUpdate = vi.spyOn(mockInstituteRepo, 'update');

      const updateUseCase = new UpdateInstituteUseCase(mockInstituteRepo);

      await expect(
        updateUseCase.execute({
          id: 'inst_B',
          details: { name: 'Hacked Name' },
          tenantContext: ownerCtx,
        }),
      ).rejects.toThrow(AuthorizationError);

      expect(spyUpdate).not.toHaveBeenCalled();
    });

    it('rejects cross-tenant membership lookup by id', async () => {
      const assistantCtx = createTenantContext('assistant', { instituteId: 'inst_A' });
      vi.spyOn(mockMembershipRepo, 'findById').mockResolvedValueOnce({
        id: 'mem_100',
        instituteId: 'inst_B',
        userId: 'usr_target',
      } as any);

      const useCase = new GetInstituteMembershipUseCase(mockMembershipRepo);

      await expect(
        useCase.execute({
          id: 'mem_100',
          tenantContext: assistantCtx,
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('5. Membership Lifecycle Security (active vs suspended vs removed)', () => {
    const roles: MembershipRole[] = ['owner', 'teacher', 'assistant', 'parent'];

    roles.forEach((role) => {
      it(`denies all capabilities for suspended ${role} context`, () => {
        const suspendedCtx = createTenantContext(role, { status: 'suspended' });
        for (const cap of Object.values(CAPABILITIES)) {
          expect(AuthorizationEngine.hasCapability(suspendedCtx, cap)).toBe(false);
        }
      });

      it(`denies all capabilities for removed ${role} context`, () => {
        const removedCtx = createTenantContext(role, { status: 'removed' });
        for (const cap of Object.values(CAPABILITIES)) {
          expect(AuthorizationEngine.hasCapability(removedCtx, cap)).toBe(false);
        }
      });
    });
  });

  describe('6. Role Escalation Attack Prevention', () => {
    it('prevents assistant from creating an owner membership', async () => {
      const assistantCtx = createTenantContext('assistant');
      const useCase = new CreateInstituteMembershipUseCase(mockMembershipRepo);

      await expect(
        useCase.execute({
          userId: 'usr_new',
          instituteId: 'inst_alpha',
          role: 'owner',
          tenantContext: assistantCtx,
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('prevents teacher from promoting a member to owner', async () => {
      const teacherCtx = createTenantContext('teacher');
      vi.spyOn(mockMembershipRepo, 'findById').mockResolvedValueOnce({
        id: 'mem_target',
        instituteId: 'inst_alpha',
        role: 'assistant',
      } as any);

      const useCase = new UpdateMembershipRoleUseCase(mockMembershipRepo);

      await expect(
        useCase.execute({
          id: 'mem_target',
          role: 'owner',
          tenantContext: teacherCtx,
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('7. Membership Enumeration Security', () => {
    it('prevents inspecting another user memberships via GetUserMembershipsUseCase', async () => {
      const useCase = new GetUserMembershipsUseCase(mockMembershipRepo);

      await expect(
        useCase.execute({
          userId: 'usr_victim',
          authenticatedUserId: 'usr_attacker',
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('8. Resource Scope & Layer Bypass Security (Capability AND Scope)', () => {
    const studentRecord: StudentBatchScopeRecord = {
      id: 'std_100',
      instituteId: 'inst_alpha',
      batchIds: ['batch_physics_1'],
    };

    it('layer bypass test 1: parent with linked child cannot execute student:create (Capability fails)', () => {
      const parentCtx = createTenantContext('parent');
      const parentScope = { linkedStudentIds: ['std_100'] };

      expect(canAccessStudent(parentCtx, studentRecord, CAPABILITIES.STUDENT_CREATE, parentScope)).toBe(false);
      expect(() =>
        requireStudentAccess(parentCtx, studentRecord, CAPABILITIES.STUDENT_CREATE, parentScope),
      ).toThrow(AuthorizationError);
    });

    it('layer bypass test 2: teacher with assigned batch cannot execute billing:read (Capability fails)', () => {
      const teacherCtx = createTenantContext('teacher');
      const teacherScope: TeacherResourceScope = { batchIds: ['batch_physics_1'] };

      expect(canAccessStudent(teacherCtx, studentRecord, CAPABILITIES.BILLING_READ, undefined, teacherScope)).toBe(false);
    });

    it('layer bypass test 3: parent with student:read cannot access unlinked child (Resource scope fails)', () => {
      const parentCtx = createTenantContext('parent');
      const parentScope = { linkedStudentIds: ['std_OTHER'] };

      expect(canAccessStudent(parentCtx, studentRecord, CAPABILITIES.STUDENT_READ, parentScope)).toBe(false);
      expect(canParentAccessStudent(parentCtx, studentRecord, ['std_OTHER'])).toBe(false);
    });

    it('layer bypass test 4: teacher with student:read cannot access unassigned batch student (Resource scope fails)', () => {
      const teacherCtx = createTenantContext('teacher');
      const teacherScope: TeacherResourceScope = { batchIds: ['batch_chemistry_2'] };

      expect(canAccessStudent(teacherCtx, studentRecord, CAPABILITIES.STUDENT_READ, undefined, teacherScope)).toBe(false);
      expect(canTeacherAccessBatch(teacherCtx, { id: 'batch_physics_1', instituteId: 'inst_alpha' }, teacherScope)).toBe(false);
      expect(canTeacherAccessStudent(teacherCtx, studentRecord, teacherScope)).toBe(false);
    });
  });

  describe('9. Invariant & Database Independence Audits', () => {
    it('invariant A: unknown role or unknown capability returns false without throwing', () => {
      expect(getCapabilitiesForRole('superadmin').size).toBe(0);
      expect(roleHasCapability('superadmin', CAPABILITIES.INSTITUTE_READ)).toBe(false);

      const ctx = createTenantContext('owner');
      expect(AuthorizationEngine.hasCapability(ctx, 'invalid:action' as any)).toBe(false);
    });

    it('invariant B: 0 database queries performed in authorization evaluation layer', () => {
      const ctx = createTenantContext('teacher');
      const teacherScope = { batchIds: ['b1'] };
      const student = { id: 's1', instituteId: 'inst_alpha', batchIds: ['b1'] };

      // In-memory execution completes synchronously without async db promises
      const allowed = canAccessStudent(ctx, student, CAPABILITIES.STUDENT_READ, undefined, teacherScope);
      expect(allowed).toBe(true);
    });
  });
});
