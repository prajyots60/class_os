import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  db,
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
} from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { ParentIdentityEntity } from '../../domain/entities/parent-identity.entity';
import { PrismaParentIdentityRepository } from './prisma-parent-identity.repository';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';

describe('PrismaParentIdentityRepository Integration Suite', () => {
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

  it('1. creates and persists a new ParentIdentity entity in PostgreSQL', async () => {
    const entity = ParentIdentityEntity.create({
      phone: '9876543210',
      name: 'Ramesh Sharma',
      avatar: 'https://example.com/ramesh.jpg',
    });

    const saved = await repository.create(entity);

    expect(saved.id).toBe(entity.id);
    expect(saved.phoneValue).toBe('+919876543210');
    expect(saved.name).toBe('Ramesh Sharma');
    expect(saved.avatar).toBe('https://example.com/ramesh.jpg');
    expect(saved.status).toBe('active');

    // Verify direct DB persistence
    const dbRecord = await db.parentIdentity.findUnique({
      where: { id: entity.id },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.phone).toBe('+919876543210');
    expect(dbRecord?.status).toBe('active');
  });

  it('2. finds a ParentIdentity by ID', async () => {
    const entity = ParentIdentityEntity.create({
      phone: '+919876543210',
      name: 'Kavita Verma',
    });
    await repository.create(entity);

    const found = await repository.findById(entity.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(entity.id);
    expect(found?.name).toBe('Kavita Verma');
  });

  it('3. finds a ParentIdentity by phone with automatic E.164 normalization', async () => {
    const entity = ParentIdentityEntity.create({
      phone: '+919876543210',
      name: 'Anil Kumar',
    });
    await repository.create(entity);

    // Search using unformatted 10-digit string
    const found1 = await repository.findByPhone('9876543210');
    expect(found1).not.toBeNull();
    expect(found1?.id).toBe(entity.id);

    // Search using space-formatted phone string
    const found2 = await repository.findByPhone('+91 98765-43210');
    expect(found2).not.toBeNull();
    expect(found2?.id).toBe(entity.id);

    // Search using PhoneNumber value object
    const phoneVo = PhoneNumber.create('9876543210');
    const found3 = await repository.findByPhone(phoneVo);
    expect(found3).not.toBeNull();
    expect(found3?.id).toBe(entity.id);
  });

  it('4. checks existence of ParentIdentity by phone', async () => {
    const entity = ParentIdentityEntity.create({
      phone: '9876543210',
    });
    await repository.create(entity);

    expect(await repository.existsByPhone('9876543210')).toBe(true);
    expect(await repository.existsByPhone('+919876543210')).toBe(true);
    expect(await repository.existsByPhone('+919999999999')).toBe(false);
  });

  it('5. updates profile attributes and reflects changes in PostgreSQL', async () => {
    const entity = ParentIdentityEntity.create({
      phone: '+919876543210',
      name: 'Old Name',
    });
    await repository.create(entity);

    entity.updateProfile({
      name: 'Updated Name',
      avatar: 'https://example.com/updated.png',
    });

    const updated = await repository.update(entity);
    expect(updated.name).toBe('Updated Name');
    expect(updated.avatar).toBe('https://example.com/updated.png');

    const dbRecord = await db.parentIdentity.findUnique({
      where: { id: entity.id },
    });
    expect(dbRecord?.name).toBe('Updated Name');
    expect(dbRecord?.avatar).toBe('https://example.com/updated.png');
  });

  it('6. updates lifecycle state and enforces database persistence', async () => {
    const entity = ParentIdentityEntity.create({
      phone: '+919876543210',
    });
    await repository.create(entity);

    entity.changeStatus('suspended');
    await repository.update(entity);

    let dbRecord = await db.parentIdentity.findUnique({
      where: { id: entity.id },
    });
    expect(dbRecord?.status).toBe('suspended');

    entity.changeStatus('deactivated');
    await repository.update(entity);

    dbRecord = await db.parentIdentity.findUnique({
      where: { id: entity.id },
    });
    expect(dbRecord?.status).toBe('deactivated');
  });

  it('7. rejects duplicate phone number creation with ConflictError', async () => {
    const parent1 = ParentIdentityEntity.create({
      phone: '+919876543210',
      name: 'Parent One',
    });
    await repository.create(parent1);

    const parent2 = ParentIdentityEntity.create({
      phone: '9876543210', // Same phone number in raw format
      name: 'Parent Two',
    });

    await expect(repository.create(parent2)).rejects.toThrow(ConflictError);
  });

  it('8. handles concurrent duplicate identity creation safely via DB unique constraints', async () => {
    const parent1 = ParentIdentityEntity.create({ phone: '+919876543210' });
    const parent2 = ParentIdentityEntity.create({ phone: '9876543210' });

    // Execute parallel inserts
    const results = await Promise.allSettled([
      repository.create(parent1),
      repository.create(parent2),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);
  });

  it('9. throws NotFoundError when updating non-existent ParentIdentity', async () => {
    const fakeEntity = ParentIdentityEntity.from({
      id: '00000000-0000-0000-0000-000000000000',
      phone: '+919876543210',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(repository.update(fakeEntity)).rejects.toThrow(NotFoundError);
  });

  it('10. deletes ParentIdentity cleanly', async () => {
    const entity = ParentIdentityEntity.create({
      phone: '+919876543210',
    });
    await repository.create(entity);

    await repository.delete(entity.id);

    const found = await repository.findById(entity.id);
    expect(found).toBeNull();
  });

  it('11. verifies ParentIdentity is global and has NO instituteId field (Cross-Tenant Foundation Assertion)', async () => {
    const entity = ParentIdentityEntity.create({
      phone: '+919876543210',
      name: 'Global Parent',
    });
    await repository.create(entity);

    const dbRecord = await db.parentIdentity.findUnique({
      where: { id: entity.id },
    });

    // Verify entity and database record have zero institute ownership
    expect((entity as any).instituteId).toBeUndefined();
    expect((dbRecord as any).instituteId).toBeUndefined();
    expect((dbRecord as any).institute_id).toBeUndefined();
  });
});
