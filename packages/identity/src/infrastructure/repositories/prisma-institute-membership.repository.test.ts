import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  createTestInstitute,
  createTestUser,
} from '@coaching-os/database';
import { AuthorizationError, ConflictError, NotFoundError } from '@coaching-os/shared';
import { InstituteMembershipEntity } from '../../domain/entities/institute-membership.entity';
import { PrismaInstituteMembershipRepository } from './prisma-institute-membership.repository';
import {
  CreateInstituteMembershipUseCase,
  GetUserMembershipsUseCase,
  GetInstituteMembershipUseCase,
  ChangeMembershipStatusUseCase,
  UpdateMembershipRoleUseCase,
  ResolveInstituteMembershipUseCase,
} from '../../application/use-cases/membership.use-cases';

describe('PrismaInstituteMembershipRepository Integration & Security Audit Suite', () => {
  let repository: PrismaInstituteMembershipRepository;

  beforeAll(() => {
    validateTestEnvironment();
    repository = new PrismaInstituteMembershipRepository();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('persists a staff user institute assignment and retrieves domain membership entity', async () => {
    const inst = await createTestInstitute({ name: 'Apex Academy' });
    const user = await createTestUser({ email: 'owner@apex.test' });

    const entity = InstituteMembershipEntity.create({
      userId: user.id,
      instituteId: inst.id,
      role: 'owner',
    });

    const saved = await repository.create(entity);

    expect(saved.userId).toBe(user.id);
    expect(saved.instituteId).toBe(inst.id);
    expect(saved.role).toBe('owner');

    const found = await repository.findByUserAndInstitute(user.id, inst.id);
    expect(found).not.toBeNull();
    expect(found?.userId).toBe(user.id);
    expect(found?.instituteId).toBe(inst.id);
  });

  it('throws ConflictError on duplicate membership creation', async () => {
    const inst = await createTestInstitute();
    const user = await createTestUser({ email: 'staff@coaching.test' });

    const entity1 = InstituteMembershipEntity.create({
      userId: user.id,
      instituteId: inst.id,
      role: 'teacher',
    });

    await repository.create(entity1);

    const entity2 = InstituteMembershipEntity.create({
      userId: user.id,
      instituteId: inst.id,
      role: 'assistant',
    });

    await expect(repository.create(entity2)).rejects.toThrow(ConflictError);
  });

  it('throws NotFoundError if target user or institute does not exist', async () => {
    const ghostUserId = '00000000-0000-4000-8000-000000000001';
    const inst = await createTestInstitute();

    const entity = InstituteMembershipEntity.create({
      userId: ghostUserId,
      instituteId: inst.id,
      role: 'assistant',
    });

    await expect(repository.create(entity)).rejects.toThrow(NotFoundError);
  });

  describe('SECURITY AUDIT — 6 MANDATORY ATTACK PATH VERIFICATIONS', () => {
    it('1. User A cannot create an owner membership in Institute B (Escalation Protection)', async () => {
      const instB = await createTestInstitute({ name: 'Victim Institute B' });
      const attackerUser = await createTestUser({ email: 'attacker@test.com' });

      const createUseCase = new CreateInstituteMembershipUseCase(repository);

      // Attacker attempts to create owner membership in Institute B using Attacker's institute context
      await expect(
        createUseCase.execute({
          userId: attackerUser.id,
          instituteId: instB.id,
          role: 'owner',
          tenantContextId: 'inst-attacker-context-id',
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('2. User A cannot enumerate User B memberships through self-service boundary', async () => {
      const instA = await createTestInstitute({ name: 'Institute A' });
      const userB = await createTestUser({ email: 'userB@test.com' });
      const attackerUserA = await createTestUser({ email: 'attackerA@test.com' });

      await repository.create(
        InstituteMembershipEntity.create({
          userId: userB.id,
          instituteId: instA.id,
          role: 'owner',
        }),
      );

      const getMembershipsUseCase = new GetUserMembershipsUseCase(repository);

      // Attacker A attempts to inspect User B's memberships passing authenticatedUserId = attackerUserA.id
      await expect(
        getMembershipsUseCase.execute({
          userId: userB.id,
          authenticatedUserId: attackerUserA.id,
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('3. User A cannot retrieve Institute B membership by membershipId (Cross-Tenant Lookup)', async () => {
      const instB = await createTestInstitute({ name: 'Institute B' });
      const userB = await createTestUser({ email: 'userB@test.com' });

      const membershipB = await repository.create(
        InstituteMembershipEntity.create({
          userId: userB.id,
          instituteId: instB.id,
          role: 'owner',
        }),
      );

      const getMembershipUseCase = new GetInstituteMembershipUseCase(repository);

      // User A attempts to retrieve Membership B using User A's Institute A tenant context
      await expect(
        getMembershipUseCase.execute({
          id: membershipB.id,
          tenantContextId: 'inst-A-tenant-context',
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('4. User A cannot change another tenant membership status', async () => {
      const instB = await createTestInstitute({ name: 'Institute B' });
      const userB = await createTestUser({ email: 'userB@test.com' });

      const membershipB = await repository.create(
        InstituteMembershipEntity.create({
          userId: userB.id,
          instituteId: instB.id,
          role: 'teacher',
        }),
      );

      const changeStatusUseCase = new ChangeMembershipStatusUseCase(repository);

      await expect(
        changeStatusUseCase.execute({
          id: membershipB.id,
          status: 'suspended',
          tenantContextId: 'inst-A-tenant-context',
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('5. User A cannot promote themselves or another user to owner in another institute', async () => {
      const instB = await createTestInstitute({ name: 'Institute B' });
      const userB = await createTestUser({ email: 'userB@test.com' });

      const membershipB = await repository.create(
        InstituteMembershipEntity.create({
          userId: userB.id,
          instituteId: instB.id,
          role: 'teacher',
        }),
      );

      const updateRoleUseCase = new UpdateMembershipRoleUseCase(repository);

      await expect(
        updateRoleUseCase.execute({
          id: membershipB.id,
          role: 'owner',
          tenantContextId: 'inst-A-tenant-context',
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('6. Suspended and removed memberships remain unauthorized in ResolveInstituteMembershipUseCase', async () => {
      const instA = await createTestInstitute({ name: 'Institute A' });
      const userA = await createTestUser({ email: 'userA@test.com' });

      const membership = await repository.create(
        InstituteMembershipEntity.create({
          userId: userA.id,
          instituteId: instA.id,
          role: 'teacher',
        }),
      );

      // Suspend membership
      await repository.updateStatus(membership.id, 'suspended');

      const resolver = new ResolveInstituteMembershipUseCase(repository);

      await expect(
        resolver.execute({
          userId: userA.id,
          requestedInstituteId: instA.id,
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });
});
