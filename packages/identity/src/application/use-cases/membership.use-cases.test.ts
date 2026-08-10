import { describe, expect, it, beforeEach } from 'vitest';
import { AuthorizationError, ConflictError, NotFoundError } from '@coaching-os/shared';
import {
  InstituteMembershipEntity,
  type MembershipRole,
  type MembershipStatus,
} from '../../domain/entities/institute-membership.entity';
import type { InstituteMembershipRepository } from '../../domain/repositories/institute-membership.repository';
import {
  CreateInstituteMembershipUseCase,
  GetUserMembershipsUseCase,
  GetInstituteMembersUseCase,
  GetInstituteMembershipUseCase,
  ChangeMembershipStatusUseCase,
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

describe('Institute Membership Use Cases', () => {
  let repository: InMemoryMembershipRepository;

  beforeEach(() => {
    repository = new InMemoryMembershipRepository();
  });

  describe('CreateInstituteMembershipUseCase', () => {
    it('creates a new institute membership', async () => {
      const useCase = new CreateInstituteMembershipUseCase(repository);
      const membership = await useCase.execute({
        userId: 'usr-1',
        instituteId: 'inst-1',
        role: 'owner',
      });

      expect(membership.id).toBeDefined();
      expect(membership.userId).toBe('usr-1');
      expect(membership.instituteId).toBe('inst-1');
      expect(membership.role).toBe('owner');
      expect(membership.status).toBe('active');
    });

    it('rejects duplicate active membership for same user and institute', async () => {
      const useCase = new CreateInstituteMembershipUseCase(repository);
      await useCase.execute({
        userId: 'usr-1',
        instituteId: 'inst-1',
        role: 'teacher',
      });

      await expect(
        useCase.execute({
          userId: 'usr-1',
          instituteId: 'inst-1',
          role: 'assistant',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('GetUserMembershipsUseCase', () => {
    it('returns active memberships for a user', async () => {
      const createUseCase = new CreateInstituteMembershipUseCase(repository);
      await createUseCase.execute({ userId: 'usr-1', instituteId: 'inst-1', role: 'owner' });
      await createUseCase.execute({ userId: 'usr-1', instituteId: 'inst-2', role: 'parent' });

      const getUserMemberships = new GetUserMembershipsUseCase(repository);
      const userMemberships = await getUserMemberships.execute({ userId: 'usr-1' });

      expect(userMemberships).toHaveLength(2);
    });
  });

  describe('GetInstituteMembersUseCase', () => {
    it('returns institute members when tenantContextId matches', async () => {
      const createUseCase = new CreateInstituteMembershipUseCase(repository);
      await createUseCase.execute({ userId: 'usr-1', instituteId: 'inst-1', role: 'owner' });
      await createUseCase.execute({ userId: 'usr-2', instituteId: 'inst-1', role: 'teacher' });

      const getMembers = new GetInstituteMembersUseCase(repository);
      const members = await getMembers.execute({
        instituteId: 'inst-1',
        tenantContextId: 'inst-1',
      });

      expect(members).toHaveLength(2);
    });

    it('rejects cross-tenant member retrieval when tenantContextId mismatches', async () => {
      const getMembers = new GetInstituteMembersUseCase(repository);

      await expect(
        getMembers.execute({
          instituteId: 'inst-1',
          tenantContextId: 'inst-2-malicious',
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
  });
});
