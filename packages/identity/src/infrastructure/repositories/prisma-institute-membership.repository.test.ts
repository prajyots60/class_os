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
import { ResolveInstituteMembershipUseCase } from '../../application/use-cases/membership.use-cases';

describe('PrismaInstituteMembershipRepository Integration & Security Suite', () => {
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

  describe('MANDATORY TENANT SECURITY TESTS', () => {
    it('1. User A cannot access User B membership records', async () => {
      const instA = await createTestInstitute({ name: 'Institute A' });
      const instB = await createTestInstitute({ name: 'Institute B' });

      const userA = await createTestUser({ email: 'userA@test.com' });
      const userB = await createTestUser({ email: 'userB@test.com' });

      await repository.create(
        InstituteMembershipEntity.create({
          userId: userA.id,
          instituteId: instA.id,
          role: 'owner',
        }),
      );

      await repository.create(
        InstituteMembershipEntity.create({
          userId: userB.id,
          instituteId: instB.id,
          role: 'owner',
        }),
      );

      const userAMemberships = await repository.findByUserId(userA.id);
      expect(userAMemberships).toHaveLength(1);
      expect(userAMemberships[0].instituteId).toBe(instA.id);
      expect(userAMemberships[0].instituteId).not.toBe(instB.id);
    });

    it('2. User belonging to Institute A cannot access Institute B through ResolveInstituteMembershipUseCase', async () => {
      const instA = await createTestInstitute({ name: 'Institute A' });
      const instB = await createTestInstitute({ name: 'Institute B' });

      const userA = await createTestUser({ email: 'userA@test.com' });

      await repository.create(
        InstituteMembershipEntity.create({
          userId: userA.id,
          instituteId: instA.id,
          role: 'owner',
        }),
      );

      const resolver = new ResolveInstituteMembershipUseCase(repository);

      // User A attempts to resolve tenant context for Institute B
      await expect(
        resolver.execute({
          userId: userA.id,
          requestedInstituteId: instB.id,
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('3. Arbitrary client-provided instituteId cannot bypass server membership resolution', async () => {
      const instA = await createTestInstitute({ name: 'Institute A' });
      const maliciousInstId = '00000000-0000-4000-8000-999999999999';

      const userA = await createTestUser({ email: 'userA@test.com' });
      await repository.create(
        InstituteMembershipEntity.create({
          userId: userA.id,
          instituteId: instA.id,
          role: 'owner',
        }),
      );

      const resolver = new ResolveInstituteMembershipUseCase(repository);

      await expect(
        resolver.execute({
          userId: userA.id,
          requestedInstituteId: maliciousInstId,
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });
});
