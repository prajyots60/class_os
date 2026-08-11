import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  db,
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  createTestInstitute,
} from '@coaching-os/database';
import { NotFoundError, ValidationError } from '@coaching-os/shared';
import { PrismaParentIdentityRepository } from '../../infrastructure/repositories/prisma-parent-identity.repository';
import {
  CreateParentIdentityUseCase,
  GetParentIdentityUseCase,
  GetParentIdentityByPhoneUseCase,
  UpdateParentIdentityProfileUseCase,
  ChangeParentIdentityStatusUseCase,
  ResolveParentIdentityForUserUseCase,
} from './parent-identity.use-cases';

describe('ParentIdentity Application Use Cases Suite', () => {
  let repository: PrismaParentIdentityRepository;

  beforeAll(() => {
    validateTestEnvironment();
    repository = new PrismaParentIdentityRepository();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  describe('CreateParentIdentityUseCase', () => {
    it('creates a new identity with E.164 normalized phone number', async () => {
      const useCase = new CreateParentIdentityUseCase(repository);
      const result = await useCase.execute({
        phone: '9876543210',
        name: 'Ramesh Patel',
      });

      expect(result.id).toBeDefined();
      expect(result.phone).toBe('+919876543210');
      expect(result.name).toBe('Ramesh Patel');
      expect(result.status).toBe('active');
    });

    it('returns existing identity idempotently when creating with duplicate phone', async () => {
      const useCase = new CreateParentIdentityUseCase(repository);
      const first = await useCase.execute({
        phone: '+919876543210',
        name: 'Ramesh Patel',
      });

      const second = await useCase.execute({
        phone: '+919876543210',
        name: 'Ramesh Patel Duplicate',
      });

      expect(second.id).toBe(first.id);
      expect(second.phone).toBe('+919876543210');
    });
  });

  describe('GetParentIdentityUseCase & GetParentIdentityByPhoneUseCase', () => {
    it('retrieves identity by ID and by phone correctly', async () => {
      const createUseCase = new CreateParentIdentityUseCase(repository);
      const created = await createUseCase.execute({
        phone: '+919876543210',
        name: 'Suresh Kumar',
      });

      const getByIdUseCase = new GetParentIdentityUseCase(repository);
      const byId = await getByIdUseCase.execute({ id: created.id });
      expect(byId.name).toBe('Suresh Kumar');

      const getByPhoneUseCase = new GetParentIdentityByPhoneUseCase(repository);
      const byPhone = await getByPhoneUseCase.execute({ phone: '9876543210' });
      expect(byPhone.id).toBe(created.id);
    });

    it('throws NotFoundError for non-existent ID or phone', async () => {
      const getByIdUseCase = new GetParentIdentityUseCase(repository);
      await expect(
        getByIdUseCase.execute({ id: '00000000-0000-4000-a000-000000000000' }),
      ).rejects.toThrow(NotFoundError);

      const getByPhoneUseCase = new GetParentIdentityByPhoneUseCase(repository);
      await expect(getByPhoneUseCase.execute({ phone: '+919999999999' })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('UpdateParentIdentityProfileUseCase', () => {
    it('updates profile name and avatar', async () => {
      const createUseCase = new CreateParentIdentityUseCase(repository);
      const created = await createUseCase.execute({
        phone: '+919876543210',
        name: 'Old Name',
      });

      const updateUseCase = new UpdateParentIdentityProfileUseCase(repository);
      const updated = await updateUseCase.execute({
        id: created.id,
        name: 'New Name',
        avatar: 'https://example.com/avatar.png',
      });

      expect(updated.name).toBe('New Name');
      expect(updated.avatar).toBe('https://example.com/avatar.png');
    });

    it('prevents profile update when identity is deactivated', async () => {
      const createUseCase = new CreateParentIdentityUseCase(repository);
      const created = await createUseCase.execute({ phone: '+919876543210' });

      const statusUseCase = new ChangeParentIdentityStatusUseCase(repository);
      await statusUseCase.execute({ id: created.id, status: 'deactivated' });

      const updateUseCase = new UpdateParentIdentityProfileUseCase(repository);
      await expect(
        updateUseCase.execute({ id: created.id, name: 'Attempted Update' }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('ChangeParentIdentityStatusUseCase', () => {
    it('executes valid status transitions (active -> suspended -> active)', async () => {
      const createUseCase = new CreateParentIdentityUseCase(repository);
      const created = await createUseCase.execute({ phone: '+919876543210' });

      const statusUseCase = new ChangeParentIdentityStatusUseCase(repository);
      const suspended = await statusUseCase.execute({
        id: created.id,
        status: 'suspended',
      });
      expect(suspended.status).toBe('suspended');

      const reactivated = await statusUseCase.execute({
        id: created.id,
        status: 'active',
      });
      expect(reactivated.status).toBe('active');
    });

    it('rejects invalid state transitions out of deactivated state', async () => {
      const createUseCase = new CreateParentIdentityUseCase(repository);
      const created = await createUseCase.execute({ phone: '+919876543210' });

      const statusUseCase = new ChangeParentIdentityStatusUseCase(repository);
      await statusUseCase.execute({ id: created.id, status: 'deactivated' });

      await expect(
        statusUseCase.execute({ id: created.id, status: 'active' }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('ResolveParentIdentityForUserUseCase', () => {
    it('resolves identity via phone and links user.parentIdentityId', async () => {
      const inst = await createTestInstitute();
      const createUseCase = new CreateParentIdentityUseCase(repository);
      const parent = await createUseCase.execute({
        phone: '+919876543210',
        name: 'Parent User',
      });

      const user = await db.user.create({
        data: {
          email: 'parent@example.com',
          name: 'Parent User',
          phone: '+919876543210',
          instituteId: inst.id,
        },
      });

      const resolveUseCase = new ResolveParentIdentityForUserUseCase(repository);
      const resolved = await resolveUseCase.execute({ userId: user.id });

      expect(resolved).not.toBeNull();
      expect(resolved?.id).toBe(parent.id);

      // Verify DB link established
      const updatedUser = await db.user.findUnique({ where: { id: user.id } });
      expect(updatedUser?.parentIdentityId).toBe(parent.id);
    });

    it('auto-creates identity if missing and autoCreateIfMissing is true', async () => {
      const inst = await createTestInstitute();
      const user = await db.user.create({
        data: {
          email: 'autocreate@example.com',
          name: 'Auto Parent',
          phone: '9876543210',
          instituteId: inst.id,
        },
      });

      const resolveUseCase = new ResolveParentIdentityForUserUseCase(repository);
      const resolved = await resolveUseCase.execute({
        userId: user.id,
        autoCreateIfMissing: true,
      });

      expect(resolved).not.toBeNull();
      expect(resolved?.phone).toBe('+919876543210');

      const updatedUser = await db.user.findUnique({ where: { id: user.id } });
      expect(updatedUser?.parentIdentityId).toBe(resolved?.id);
    });

    it('returns null when identity is missing and autoCreateIfMissing is false', async () => {
      const inst = await createTestInstitute();
      const user = await db.user.create({
        data: {
          email: 'noauto@example.com',
          name: 'No Auto',
          phone: '+919999988888',
          instituteId: inst.id,
        },
      });

      const resolveUseCase = new ResolveParentIdentityForUserUseCase(repository);
      const resolved = await resolveUseCase.execute({
        userId: user.id,
        autoCreateIfMissing: false,
      });

      expect(resolved).toBeNull();
    });
  });
});
