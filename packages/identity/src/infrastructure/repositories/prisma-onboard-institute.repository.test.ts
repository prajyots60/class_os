import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  createTestUser,
  createTestInstitute,
  db,
} from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { InstituteEntity } from '../../domain/entities/institute.entity';
import { InstituteMembershipEntity } from '../../domain/entities/institute-membership.entity';
import { PrismaOnboardInstituteRepository } from './prisma-onboard-institute.repository';

describe('PrismaOnboardInstituteRepository Real PostgreSQL Idempotency & Race-Condition Suite', () => {
  let repository: PrismaOnboardInstituteRepository;

  beforeAll(() => {
    validateTestEnvironment();
    repository = new PrismaOnboardInstituteRepository();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  describe('A & F. Existing User Protection & Retry Semantics', () => {
    it('A. Rejects onboarding with ConflictError if user is already associated with an institute', async () => {
      const existingInst = await createTestInstitute({
        name: 'Pre-existing Inst',
        slug: 'pre-existing-inst',
      });

      const user = await createTestUser({
        name: 'Already Onboarded User',
        email: 'already_onboarded@test.com',
        instituteId: existingInst.id,
      });

      const instToCreate = InstituteEntity.create({
        name: 'Second Institute Attempt',
        slug: 'second-inst-attempt',
        phone: '+919876543210',
        email: 'second@test.com',
      });

      const membership = InstituteMembershipEntity.create({
        userId: user.id,
        instituteId: instToCreate.id,
        role: 'owner',
        status: 'active',
      });

      await expect(repository.onboard(instToCreate, membership)).rejects.toThrow(ConflictError);

      // Verify no second institute was created in PostgreSQL
      const foundSecond = await db.institute.findUnique({
        where: { id: instToCreate.id },
      });
      expect(foundSecond).toBeNull();
    });

    it('F. Retry after successful onboarding is rejected cleanly with ConflictError', async () => {
      const user = await createTestUser({
        name: 'Retry Founder',
        email: 'retry_founder@test.com',
      });

      const inst1 = InstituteEntity.create({
        name: 'First Institute',
        slug: 'first-institute',
        phone: '+919876543210',
        email: 'first@test.com',
      });

      const mem1 = InstituteMembershipEntity.create({
        userId: user.id,
        instituteId: inst1.id,
        role: 'owner',
        status: 'active',
      });

      // First onboarding succeeds
      const result1 = await repository.onboard(inst1, mem1);
      expect(result1.institute.id).toBe(inst1.id);

      // User retries onboarding with another institute
      const inst2 = InstituteEntity.create({
        name: 'Second Institute Retry',
        slug: 'second-institute-retry',
        phone: '+919876543211',
        email: 'second@test.com',
      });

      const mem2 = InstituteMembershipEntity.create({
        userId: user.id,
        instituteId: inst2.id,
        role: 'owner',
        status: 'active',
      });

      await expect(repository.onboard(inst2, mem2)).rejects.toThrow(ConflictError);

      // Verify user remains bound ONLY to first institute
      const dbUser = await db.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.instituteId).toBe(inst1.id);
    });
  });

  describe('B & C. Concurrency & Race Condition Suite', () => {
    it('B. Simultaneous onboarding requests for the SAME user result in exactly ONE Institute and ConflictError on losing request', async () => {
      const user = await createTestUser({
        name: 'Race User',
        email: 'race_user@test.com',
      });

      const instA = InstituteEntity.create({
        name: 'Concurrent Inst A',
        slug: 'concurrent-inst-a',
        phone: '+919800000001',
        email: 'a@test.com',
      });

      const instB = InstituteEntity.create({
        name: 'Concurrent Inst B',
        slug: 'concurrent-inst-b',
        phone: '+919800000002',
        email: 'b@test.com',
      });

      const memA = InstituteMembershipEntity.create({
        userId: user.id,
        instituteId: instA.id,
        role: 'owner',
        status: 'active',
      });

      const memB = InstituteMembershipEntity.create({
        userId: user.id,
        instituteId: instB.id,
        role: 'owner',
        status: 'active',
      });

      // Fire both transactions simultaneously for the exact same user
      const results = await Promise.allSettled([
        repository.onboard(instA, memA),
        repository.onboard(instB, memB),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);

      // Verify PostgreSQL state: User is bound to exactly ONE institute, and only 1 of the 2 institutes exists in DB!
      const dbUser = await db.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.instituteId).toBeDefined();

      const createdInsts = await db.institute.findMany({
        where: { id: { in: [instA.id, instB.id] } },
      });
      expect(createdInsts).toHaveLength(1);
      expect(createdInsts[0].id).toBe(dbUser?.instituteId);
    });

    it('C & G. Same-slug concurrent onboarding for DIFFERENT users results in exactly ONE Institute and does not mutate losing user tenancy', async () => {
      const userA = await createTestUser({ name: 'User A', email: 'usera@test.com' });
      const userB = await createTestUser({ name: 'User B', email: 'userb@test.com' });

      const instA = InstituteEntity.create({
        name: 'Same Slug Inst',
        slug: 'same-slug-inst',
        phone: '+919800000010',
        email: 'a@test.com',
      });

      const instB = InstituteEntity.create({
        name: 'Same Slug Inst B',
        slug: 'same-slug-inst',
        phone: '+919800000020',
        email: 'b@test.com',
      });

      const memA = InstituteMembershipEntity.create({
        userId: userA.id,
        instituteId: instA.id,
        role: 'owner',
        status: 'active',
      });

      const memB = InstituteMembershipEntity.create({
        userId: userB.id,
        instituteId: instB.id,
        role: 'owner',
        status: 'active',
      });

      const results = await Promise.allSettled([
        repository.onboard(instA, memA),
        repository.onboard(instB, memB),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);

      // Verify PostgreSQL state: Exactly ONE institute exists for 'same-slug-inst'
      const institutesInDb = await db.institute.findMany({
        where: { slug: 'same-slug-inst' },
      });
      expect(institutesInDb).toHaveLength(1);

      // Winning user is linked, losing user remains unlinked (null)
      const dbUserA = await db.user.findUnique({ where: { id: userA.id } });
      const dbUserB = await db.user.findUnique({ where: { id: userB.id } });

      const linkedUsers = [dbUserA, dbUserB].filter((u) => u?.instituteId !== null);
      const unlinkedUsers = [dbUserA, dbUserB].filter((u) => u?.instituteId === null);

      expect(linkedUsers).toHaveLength(1);
      expect(unlinkedUsers).toHaveLength(1);
    });

    it('C2. High Concurrency: 5 simultaneous onboarding attempts for the SAME user result in exactly ONE successful onboarding and 4 conflicts', async () => {
      const user = await createTestUser({
        name: 'High Concurrency Founder',
        email: 'high_conc_founder@test.com',
      });

      const attempts = Array.from({ length: 5 }, (_, i) => {
        const inst = InstituteEntity.create({
          name: `Concurrent Inst ${i}`,
          slug: `conc-inst-${i}-${Date.now()}`,
          phone: `+9198000000${i}0`,
          email: `conc_${i}@test.com`,
        });

        const mem = InstituteMembershipEntity.create({
          userId: user.id,
          instituteId: inst.id,
          role: 'owner',
          status: 'active',
        });

        return { inst, mem };
      });

      const results = await Promise.allSettled(
        attempts.map(({ inst, mem }) => repository.onboard(inst, mem)),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(4);
      rejected.forEach((r) => {
        expect((r as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);
      });

      // Verify DB consistency: exactly 1 institute created, user points to that 1 institute
      const dbUser = await db.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.instituteId).toBeDefined();

      const createdCount = await db.institute.count({
        where: { id: { in: attempts.map((a) => a.inst.id) } },
      });
      expect(createdCount).toBe(1);
    });

    it('G2. High Concurrency: 5 simultaneous onboarding attempts with the SAME slug across 5 different users create exactly ONE institute', async () => {
      const users = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          createTestUser({
            name: `Slug User ${i}`,
            email: `slug_user_${i}_${Date.now()}@test.com`,
          }),
        ),
      );

      const sharedSlug = `shared-slug-${Date.now()}`;

      const attempts = users.map((u, i) => {
        const inst = InstituteEntity.create({
          name: `Shared Slug Academy ${i}`,
          slug: sharedSlug,
          phone: `+9198111100${i}0`,
          email: `shared_${i}@test.com`,
        });

        const mem = InstituteMembershipEntity.create({
          userId: u.id,
          instituteId: inst.id,
          role: 'owner',
          status: 'active',
        });

        return { user: u, inst, mem };
      });

      const results = await Promise.allSettled(
        attempts.map(({ inst, mem }) => repository.onboard(inst, mem)),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(4);

      // Verify DB consistency: exactly 1 institute created for the slug
      const institutesInDb = await db.institute.findMany({ where: { slug: sharedSlug } });
      expect(institutesInDb).toHaveLength(1);

      // Exactly 1 user bound, 4 unlinked
      const dbUsers = await db.user.findMany({
        where: { id: { in: users.map((u) => u.id) } },
      });
      const boundUsers = dbUsers.filter((u) => u.instituteId !== null);
      const unboundUsers = dbUsers.filter((u) => u.instituteId === null);

      expect(boundUsers).toHaveLength(1);
      expect(unboundUsers).toHaveLength(4);
    });
  });

  describe('D & E. Atomic Rollback Guarantees', () => {
    it('D & E. Failed transaction leaves zero Institute rows and leaves User.instituteId unchanged (null)', async () => {
      const user = await createTestUser({
        name: 'Non Existent Test',
        email: 'nonexistent_test@test.com',
      });

      const invalidUserId = '00000000-0000-4000-a000-000000000099';

      const inst = InstituteEntity.create({
        name: 'Failed Inst',
        slug: 'failed-inst',
        phone: '+919800000000',
        email: 'fail@test.com',
      });

      const mem = InstituteMembershipEntity.create({
        userId: invalidUserId,
        instituteId: inst.id,
        role: 'owner',
        status: 'active',
      });

      await expect(repository.onboard(inst, mem)).rejects.toThrow(NotFoundError);

      // Verify zero institute created
      const dbInst = await db.institute.findUnique({ where: { id: inst.id } });
      expect(dbInst).toBeNull();

      // Verify legitimate user remains unchanged (null)
      const dbUser = await db.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.instituteId).toBeNull();
    });
  });
});

