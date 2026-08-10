import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AuthorizationError, ConflictError, NotFoundError } from '@coaching-os/shared';
import {
  InstituteMembershipEntity,
  type MembershipRole,
  type MembershipStatus,
} from '../../domain/entities/institute-membership.entity';
import type { InstituteMembershipRepository } from '../../domain/repositories/institute-membership.repository';
import type { TenantContext } from './membership.use-cases';
import {
  CreateInstituteMembershipUseCase,
  GetUserMembershipsUseCase,
  GetInstituteMembersUseCase,
  GetInstituteMembershipUseCase,
  ChangeMembershipStatusUseCase,
  UpdateMembershipRoleUseCase,
  ResolveInstituteMembershipUseCase,
} from './membership.use-cases';

class InMemoryMembershipRepository implements InstituteMembershipRepository {
  private memberships = new Map<string, InstituteMembershipEntity>();

  public async create(membership: InstituteMembershipEntity): Promise<InstituteMembershipEntity> {
    const key = `${membership.userId}:${membership.instituteId}`;
    for (const m of this.memberships.values()) {
      if (`${m.userId}:${m.instituteId}` === key && m.status !== 'removed') {
        throw new ConflictError(`User ${m.userId} is already a member of institute ${m.instituteId}.`);
      }
    }
    this.memberships.set(membership.id, membership);
    return membership;
  }

  public async findById(id: string): Promise<InstituteMembershipEntity | null> {
    return this.memberships.get(id) || null;
  }

  public async findByUserAndInstitute(
    userId: string,
    instituteId: string,
  ): Promise<InstituteMembershipEntity | null> {
    for (const m of this.memberships.values()) {
      if (m.userId === userId && m.instituteId === instituteId) {
        return m;
      }
    }
    return null;
  }

  public async findByUserId(userId: string): Promise<InstituteMembershipEntity[]> {
    return Array.from(this.memberships.values()).filter((m) => m.userId === userId);
  }

  public async findByInstituteId(instituteId: string): Promise<InstituteMembershipEntity[]> {
    return Array.from(this.memberships.values()).filter((m) => m.instituteId === instituteId);
  }

  public async updateStatus(id: string, status: MembershipStatus): Promise<InstituteMembershipEntity> {
    const existing = this.memberships.get(id);
    if (!existing) {
      throw new NotFoundError(`Membership ${id} not found.`);
    }
    if (status === 'removed') existing.remove();
    else if (status === 'suspended') existing.suspend();
    else if (status === 'active') existing.activate();

    this.memberships.set(id, existing);
    return existing;
  }

  public async updateRole(id: string, role: MembershipRole): Promise<InstituteMembershipEntity> {
    const existing = this.memberships.get(id);
    if (!existing) {
      throw new NotFoundError(`Membership ${id} not found.`);
    }
    existing.updateRole(role);
    this.memberships.set(id, existing);
    return existing;
  }

  public async delete(id: string): Promise<void> {
    this.memberships.delete(id);
  }
}

describe('Institute Membership Use Cases — Security Unit Suite', () => {
  let repository: InMemoryMembershipRepository;

  beforeEach(() => {
    repository = new InMemoryMembershipRepository();
  });

  describe('CreateInstituteMembershipUseCase Capability Integration', () => {
    it('creates a staff membership when owner context provides staff:invite capability', async () => {
      const useCase = new CreateInstituteMembershipUseCase(repository);

      const ownerCtx: TenantContext = {
        userId: 'usr-owner',
        instituteId: 'inst-1',
        membershipId: 'mem-owner',
        role: 'owner',
        status: 'active',
      };

      const membership = await useCase.execute({
        userId: 'usr-new-teacher',
        instituteId: 'inst-1',
        role: 'teacher',
        tenantContext: ownerCtx,
      });

      expect(membership.id).toBeDefined();
      expect(membership.userId).toBe('usr-new-teacher');
      expect(membership.role).toBe('teacher');
    });

    it('rejects membership creation by teacher lacking staff:invite capability', async () => {
      const useCase = new CreateInstituteMembershipUseCase(repository);

      const teacherCtx: TenantContext = {
        userId: 'usr-teacher',
        instituteId: 'inst-1',
        membershipId: 'mem-teacher',
        role: 'teacher',
        status: 'active',
      };

      await expect(
        useCase.execute({
          userId: 'usr-new-staff',
          instituteId: 'inst-1',
          role: 'assistant',
          tenantContext: teacherCtx,
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('prevents owner escalation when non-owner assistant attempts to create an owner membership', async () => {
      const useCase = new CreateInstituteMembershipUseCase(repository);

      const assistantCtx: TenantContext = {
        userId: 'usr-assistant',
        instituteId: 'inst-1',
        membershipId: 'mem-assistant',
        role: 'assistant',
        status: 'active',
      };

      await expect(
        useCase.execute({
          userId: 'usr-new-owner',
          instituteId: 'inst-1',
          role: 'owner',
          tenantContext: assistantCtx,
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('GetInstituteMembersUseCase Capability Integration', () => {
    it('allows assistant with staff:read capability to list institute members', async () => {
      const createUseCase = new CreateInstituteMembershipUseCase(repository);
      await createUseCase.execute({ userId: 'usr-1', instituteId: 'inst-1', role: 'owner' });

      const assistantCtx: TenantContext = {
        userId: 'usr-2',
        instituteId: 'inst-1',
        membershipId: 'mem-2',
        role: 'assistant',
        status: 'active',
      };

      const getMembersUseCase = new GetInstituteMembersUseCase(repository);
      const members = await getMembersUseCase.execute({
        instituteId: 'inst-1',
        tenantContext: assistantCtx,
      });

      expect(members.length).toBeGreaterThanOrEqual(1);
    });

    it('rejects members list request by teacher lacking staff:read capability', async () => {
      const teacherCtx: TenantContext = {
        userId: 'usr-teacher',
        instituteId: 'inst-1',
        membershipId: 'mem-teacher',
        role: 'teacher',
        status: 'active',
      };

      const getMembersUseCase = new GetInstituteMembersUseCase(repository);

      await expect(
        getMembersUseCase.execute({
          instituteId: 'inst-1',
          tenantContext: teacherCtx,
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('UpdateMembershipRoleUseCase Capability Integration', () => {
    it('allows owner to update staff member role using staff:role_change capability', async () => {
      const createUseCase = new CreateInstituteMembershipUseCase(repository);
      const created = await createUseCase.execute({
        userId: 'usr-staff',
        instituteId: 'inst-1',
        role: 'assistant',
      });

      const ownerCtx: TenantContext = {
        userId: 'usr-owner',
        instituteId: 'inst-1',
        membershipId: 'mem-owner',
        role: 'owner',
        status: 'active',
      };

      const updateRoleUseCase = new UpdateMembershipRoleUseCase(repository);
      const updated = await updateRoleUseCase.execute({
        id: created.id,
        role: 'teacher',
        tenantContext: ownerCtx,
      });

      expect(updated.role).toBe('teacher');
    });

    it('rejects role update attempt by assistant lacking staff:role_change capability BEFORE repository write', async () => {
      const createUseCase = new CreateInstituteMembershipUseCase(repository);
      const created = await createUseCase.execute({
        userId: 'usr-staff',
        instituteId: 'inst-1',
        role: 'teacher',
      });

      const assistantCtx: TenantContext = {
        userId: 'usr-assistant',
        instituteId: 'inst-1',
        membershipId: 'mem-assistant',
        role: 'assistant',
        status: 'active',
      };

      const spyUpdateRole = vi.spyOn(repository, 'updateRole');
      const updateRoleUseCase = new UpdateMembershipRoleUseCase(repository);

      await expect(
        updateRoleUseCase.execute({
          id: created.id,
          role: 'owner',
          tenantContext: assistantCtx,
        }),
      ).rejects.toThrow(AuthorizationError);

      expect(spyUpdateRole).not.toHaveBeenCalled();
    });
  });

  describe('ChangeMembershipStatusUseCase Capability Integration', () => {
    it('allows owner to suspend membership using staff:remove capability', async () => {
      const createUseCase = new CreateInstituteMembershipUseCase(repository);
      const created = await createUseCase.execute({
        userId: 'usr-staff',
        instituteId: 'inst-1',
        role: 'teacher',
      });

      const ownerCtx: TenantContext = {
        userId: 'usr-owner',
        instituteId: 'inst-1',
        membershipId: 'mem-owner',
        role: 'owner',
        status: 'active',
      };

      const changeStatusUseCase = new ChangeMembershipStatusUseCase(repository);
      const updated = await changeStatusUseCase.execute({
        id: created.id,
        status: 'suspended',
        tenantContext: ownerCtx,
      });

      expect(updated.status).toBe('suspended');
    });

    it('rejects status change by teacher lacking staff status management capabilities', async () => {
      const createUseCase = new CreateInstituteMembershipUseCase(repository);
      const created = await createUseCase.execute({
        userId: 'usr-staff',
        instituteId: 'inst-1',
        role: 'assistant',
      });

      const teacherCtx: TenantContext = {
        userId: 'usr-teacher',
        instituteId: 'inst-1',
        membershipId: 'mem-teacher',
        role: 'teacher',
        status: 'active',
      };

      const changeStatusUseCase = new ChangeMembershipStatusUseCase(repository);

      await expect(
        changeStatusUseCase.execute({
          id: created.id,
          status: 'removed',
          tenantContext: teacherCtx,
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('GetUserMembershipsUseCase Self-Service Scoping', () => {
    it('returns active memberships for authenticated self-service user', async () => {
      const createUseCase = new CreateInstituteMembershipUseCase(repository);
      await createUseCase.execute({ userId: 'usr-1', instituteId: 'inst-1', role: 'owner' });

      const getUserMemberships = new GetUserMembershipsUseCase(repository);
      const memberships = await getUserMemberships.execute({
        userId: 'usr-1',
        authenticatedUserId: 'usr-1',
      });

      expect(memberships).toHaveLength(1);
    });

    it('rejects cross-user membership enumeration when authenticatedUserId mismatches requested userId', async () => {
      const getUserMemberships = new GetUserMembershipsUseCase(repository);

      await expect(
        getUserMemberships.execute({
          userId: 'usr-victim',
          authenticatedUserId: 'usr-attacker',
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('ResolveInstituteMembershipUseCase (Security Backbone)', () => {
    it('resolves valid active membership to trusted TenantContext', async () => {
      const createUseCase = new CreateInstituteMembershipUseCase(repository);
      await createUseCase.execute({ userId: 'usr-1', instituteId: 'inst-1', role: 'owner' });

      const resolver = new ResolveInstituteMembershipUseCase(repository);
      const context = await resolver.execute({
        userId: 'usr-1',
        requestedInstituteId: 'inst-1',
      });

      expect(context.userId).toBe('usr-1');
      expect(context.instituteId).toBe('inst-1');
      expect(context.role).toBe('owner');
      expect(context.status).toBe('active');
    });

    it('rejects access when user is not a member of requested institute', async () => {
      const resolver = new ResolveInstituteMembershipUseCase(repository);

      await expect(
        resolver.execute({
          userId: 'usr-1',
          requestedInstituteId: 'inst-2-unauthorized',
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('rejects access when user membership is suspended', async () => {
      const createUseCase = new CreateInstituteMembershipUseCase(repository);
      const membership = await createUseCase.execute({
        userId: 'usr-1',
        instituteId: 'inst-1',
        role: 'teacher',
      });

      const changeStatus = new ChangeMembershipStatusUseCase(repository);
      await changeStatus.execute({ id: membership.id, status: 'suspended' });

      const resolver = new ResolveInstituteMembershipUseCase(repository);

      await expect(
        resolver.execute({
          userId: 'usr-1',
          requestedInstituteId: 'inst-1',
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    // Phase 1.4.6 — Lifecycle & Isolation Extension

    it('rejects access when membership is removed', async () => {
      const createUseCase = new CreateInstituteMembershipUseCase(repository);
      const membership = await createUseCase.execute({
        userId: 'usr-lifecycle',
        instituteId: 'inst-lifecycle',
        role: 'teacher',
      });

      const changeStatus = new ChangeMembershipStatusUseCase(repository);
      await changeStatus.execute({ id: membership.id, status: 'removed' });

      const resolver = new ResolveInstituteMembershipUseCase(repository);

      await expect(
        resolver.execute({
          userId: 'usr-lifecycle',
          requestedInstituteId: 'inst-lifecycle',
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('rejects access when userId is empty', async () => {
      const resolver = new ResolveInstituteMembershipUseCase(repository);

      await expect(
        resolver.execute({ userId: '', requestedInstituteId: 'inst-1' }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('rejects access when requestedInstituteId is empty', async () => {
      const resolver = new ResolveInstituteMembershipUseCase(repository);

      await expect(
        resolver.execute({ userId: 'usr-1', requestedInstituteId: '' }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('resolves teacher role membership correctly', async () => {
      const createUseCase = new CreateInstituteMembershipUseCase(repository);
      await createUseCase.execute({ userId: 'usr-teacher', instituteId: 'inst-teacher', role: 'teacher' });

      const resolver = new ResolveInstituteMembershipUseCase(repository);
      const context = await resolver.execute({
        userId: 'usr-teacher',
        requestedInstituteId: 'inst-teacher',
      });

      expect(context.role).toBe('teacher');
      expect(context.status).toBe('active');
      expect(context.userId).toBe('usr-teacher');
      expect(context.instituteId).toBe('inst-teacher');
    });

    it('tenant isolation: User A cannot access Institute B via resolved TenantContext', async () => {
      const createUseCase = new CreateInstituteMembershipUseCase(repository);
      await createUseCase.execute({ userId: 'usr-tenant-a', instituteId: 'inst-a', role: 'owner' });
      await createUseCase.execute({ userId: 'usr-tenant-b', instituteId: 'inst-b', role: 'owner' });

      const resolver = new ResolveInstituteMembershipUseCase(repository);

      // User A requesting Institute B — must be denied
      await expect(
        resolver.execute({ userId: 'usr-tenant-a', requestedInstituteId: 'inst-b' }),
      ).rejects.toThrow(AuthorizationError);

      // User B requesting Institute A — must be denied
      await expect(
        resolver.execute({ userId: 'usr-tenant-b', requestedInstituteId: 'inst-a' }),
      ).rejects.toThrow(AuthorizationError);

      // Each user can only access their own institute
      const contextA = await resolver.execute({ userId: 'usr-tenant-a', requestedInstituteId: 'inst-a' });
      expect(contextA.instituteId).toBe('inst-a');

      const contextB = await resolver.execute({ userId: 'usr-tenant-b', requestedInstituteId: 'inst-b' });
      expect(contextB.instituteId).toBe('inst-b');
    });

    it('resolved TenantContext contains all required fields (userId, instituteId, membershipId, role, status)', async () => {
      const createUseCase = new CreateInstituteMembershipUseCase(repository);
      await createUseCase.execute({ userId: 'usr-fields', instituteId: 'inst-fields', role: 'owner' });

      const resolver = new ResolveInstituteMembershipUseCase(repository);
      const context = await resolver.execute({
        userId: 'usr-fields',
        requestedInstituteId: 'inst-fields',
      });

      expect(context.userId).toBe('usr-fields');
      expect(context.instituteId).toBe('inst-fields');
      expect(context.membershipId).toBeDefined();
      expect(typeof context.membershipId).toBe('string');
      expect(context.role).toBeDefined();
      expect(context.status).toBe('active');
    });
  });
});
