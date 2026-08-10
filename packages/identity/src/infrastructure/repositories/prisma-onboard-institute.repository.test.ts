import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  createTestUser,
  db,
} from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { InstituteEntity } from '../../domain/entities/institute.entity';
import { InstituteMembershipEntity } from '../../domain/entities/institute-membership.entity';
import { PrismaOnboardInstituteRepository } from './prisma-onboard-institute.repository';

describe('PrismaOnboardInstituteRepository Real PostgreSQL Integration & Atomic Rollback Suite', () => {
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

  describe('Atomic Transaction Persistence & Hydration', () => {
    it('1-4. Persists Institute and Owner Membership atomically in PostgreSQL and hydrates domain entities', async () => {
      const user = await createTestUser({
        name: 'Vanguard Owner',
        email: 'vanguard_owner@test.com',
      });

      const instituteEntity = InstituteEntity.create({
        name: 'Vanguard Learning Institute',
        slug: 'vanguard-learning',
        phone: '+919876543210',
        email: 'contact@vanguard.test',
        timezone: 'Asia/Kolkata',
      });

      const membershipEntity = InstituteMembershipEntity.create({
        userId: user.id,
        instituteId: instituteEntity.id,
        role: 'owner',
        status: 'active',
      });

      const result = await repository.onboard(instituteEntity, membershipEntity);

      // Verify returned domain entities
      expect(result.institute).toBeInstanceOf(InstituteEntity);
      expect(result.membership).toBeInstanceOf(InstituteMembershipEntity);
      expect(result.institute.id).toBe(instituteEntity.id);
      expect(result.institute.name).toBe('Vanguard Learning Institute');
      expect(result.institute.slug).toBe('vanguard-learning');

      expect(result.membership.userId).toBe(user.id);
      expect(result.membership.instituteId).toBe(instituteEntity.id);
      expect(result.membership.role).toBe('owner');
      expect(result.membership.status).toBe('active');

      // Direct PostgreSQL verification
      const dbInstitute = await db.institute.findUnique({
        where: { id: instituteEntity.id },
      });
      expect(dbInstitute).not.toBeNull();
      expect(dbInstitute?.name).toBe('Vanguard Learning Institute');

      const dbUser = await db.user.findUnique({
        where: { id: user.id },
      });
      expect(dbUser?.instituteId).toBe(instituteEntity.id);
      expect(dbUser?.status).toBe('active');
    });
  });

  describe('Real PostgreSQL Atomic Rollback Guarantees', () => {
    it('5 & 8. Failure during membership linking MUST roll back Institute creation (Zero Orphaned Institutes)', async () => {
      const nonExistentUserId = '00000000-0000-4000-a000-000000000099';

      const instituteEntity = InstituteEntity.create({
        name: 'Rollback Target Institute',
        slug: 'rollback-target-inst',
        phone: '+919876543210',
        email: 'rollback@test.com',
      });

      const membershipEntity = InstituteMembershipEntity.create({
        userId: nonExistentUserId,
        instituteId: instituteEntity.id,
        role: 'owner',
        status: 'active',
      });

      // Attempt onboarding with invalid user ID -> update fails with NotFoundError
      await expect(repository.onboard(instituteEntity, membershipEntity)).rejects.toThrow(
        NotFoundError,
      );

      // CRITICAL VERIFICATION: Institute MUST NOT exist in PostgreSQL!
      const dbInstitute = await db.institute.findUnique({
        where: { id: instituteEntity.id },
      });
      expect(dbInstitute).toBeNull();
    });

    it('6. Database slug constraint failure leaves zero partial records', async () => {
      const user = await createTestUser({
        name: 'Collision User',
        email: 'collision_user@test.com',
      });

      // Pre-create an institute with slug 'collision-slug'
      await db.institute.create({
        data: {
          name: 'Existing Slug Institute',
          slug: 'collision-slug',
          phone: '+919999999999',
          email: 'existing@test.com',
        },
      });

      const instituteEntity = InstituteEntity.create({
        name: 'New Colliding Institute',
        slug: 'collision-slug',
        phone: '+919876543210',
        email: 'new@test.com',
      });

      const membershipEntity = InstituteMembershipEntity.create({
        userId: user.id,
        instituteId: instituteEntity.id,
        role: 'owner',
        status: 'active',
      });

      await expect(repository.onboard(instituteEntity, membershipEntity)).rejects.toThrow(
        ConflictError,
      );

      // User must not be updated to the failed institute
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
      });
      expect(dbUser?.instituteId).toBeNull();
    });
  });

  describe('Concurrency & Uniqueness', () => {
    it('11-12. Handles concurrent onboarding attempts with identical slug cleanly in PostgreSQL', async () => {
      const userA = await createTestUser({ name: 'User A', email: 'user_a@test.com' });
      const userB = await createTestUser({ name: 'User B', email: 'user_b@test.com' });

      const instA = InstituteEntity.create({
        name: 'Concurrent Institute',
        slug: 'concurrent-slug',
        phone: '+919800000001',
        email: 'inst_a@test.com',
      });

      const instB = InstituteEntity.create({
        name: 'Concurrent Institute B',
        slug: 'concurrent-slug',
        phone: '+919800000002',
        email: 'inst_b@test.com',
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

      // Execute both onboarding attempts concurrently
      const results = await Promise.allSettled([
        repository.onboard(instA, memA),
        repository.onboard(instB, memB),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly ONE request succeeds, exactly ONE request fails with ConflictError
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);

      // Direct DB verification: Exactly ONE institute exists with slug 'concurrent-slug'
      const institutesInDb = await db.institute.findMany({
        where: { slug: 'concurrent-slug' },
      });
      expect(institutesInDb).toHaveLength(1);
    });
  });
});
