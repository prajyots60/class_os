import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  createTestInstitute,
} from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { InstituteEntity } from '../../domain/entities/institute.entity';
import { PrismaInstituteRepository } from './prisma-institute.repository';

describe('PrismaInstituteRepository Integration & Tenant Security Suite', () => {
  let repository: PrismaInstituteRepository;

  beforeAll(() => {
    validateTestEnvironment();
    repository = new PrismaInstituteRepository();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('persists a new InstituteEntity to PostgreSQL and maps back to domain model', async () => {
    const entity = InstituteEntity.create({
      name: 'Resonance Delhi',
      slug: 'resonance-delhi',
      phone: '+919811122233',
      email: 'contact@resonance.test',
      timezone: 'Asia/Kolkata',
    });

    const saved = await repository.create(entity);

    expect(saved.id).toBe(entity.id);
    expect(saved.name).toBe('Resonance Delhi');
    expect(saved.slug).toBe('resonance-delhi');
    expect(saved.phone).toBe('+919811122233');
    expect(saved.email).toBe('contact@resonance.test');
    expect(saved.status).toBe('active');
    expect(saved.createdAt).toBeInstanceOf(Date);

    const found = await repository.findById(entity.id);
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Resonance Delhi');
  });

  it('retrieves an institute by slug', async () => {
    const inst = await createTestInstitute({
      name: 'Pinnacle Kota',
      slug: 'pinnacle-kota',
    });

    const found = await repository.findBySlug('pinnacle-kota');
    expect(found).not.toBeNull();
    expect(found?.id).toBe(inst.id);
    expect(found?.name).toBe('Pinnacle Kota');
  });

  it('throws ConflictError on duplicate slug creation', async () => {
    await createTestInstitute({ slug: 'unique-slug-test' });

    const duplicateEntity = InstituteEntity.create({
      name: 'Duplicate Institute',
      slug: 'unique-slug-test',
      phone: '+919800000000',
      email: 'dup@test.com',
    });

    await expect(repository.create(duplicateEntity)).rejects.toThrow(ConflictError);
  });

  it('updates Institute details in PostgreSQL', async () => {
    const created = await repository.create(
      InstituteEntity.create({
        name: 'Original Name Institute',
        phone: '+919800000000',
        email: 'orig@test.com',
      }),
    );

    created.updateDetails({
      name: 'Renamed Institute',
      phone: '+919999999999',
    });

    const updated = await repository.update(created);

    expect(updated.name).toBe('Renamed Institute');
    expect(updated.phone).toBe('+919999999999');

    const verified = await repository.findById(created.id);
    expect(verified?.name).toBe('Renamed Institute');
  });

  it('updates Institute status explicitly', async () => {
    const created = await repository.create(
      InstituteEntity.create({
        name: 'Status Test Institute',
        phone: '+919800000000',
        email: 'status@test.com',
      }),
    );

    const suspended = await repository.updateStatus(created.id, 'suspended');
    expect(suspended.status).toBe('suspended');

    const verified = await repository.findById(created.id);
    expect(verified?.status).toBe('suspended');
  });

  it('throws NotFoundError when updating a non-existent Institute ID', async () => {
    const ghostEntity = InstituteEntity.create({
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Ghost Institute',
      slug: 'ghost-inst',
      phone: '+919800000000',
      email: 'ghost@test.com',
    });

    await expect(repository.update(ghostEntity)).rejects.toThrow(NotFoundError);
    await expect(
      repository.updateStatus('00000000-0000-4000-8000-000000000000', 'archived'),
    ).rejects.toThrow(NotFoundError);
  });

  it('TENANT SECURITY: prevents cross-tenant access and mutation between Institute A and Institute B', async () => {
    const instA = await repository.create(
      InstituteEntity.create({
        name: 'Tenant A Institute',
        slug: 'tenant-a-inst',
        phone: '+919800000001',
        email: 'tenanta@test.com',
      }),
    );

    const instB = await repository.create(
      InstituteEntity.create({
        name: 'Tenant B Institute',
        slug: 'tenant-b-inst',
        phone: '+919800000002',
        email: 'tenantb@test.com',
      }),
    );

    // Verify lookup isolation
    const foundA = await repository.findById(instA.id);
    const foundB = await repository.findById(instB.id);

    expect(foundA?.id).toBe(instA.id);
    expect(foundB?.id).toBe(instB.id);
    expect(foundA?.id).not.toBe(foundB?.id);

    // Verify mutating Institute A does not affect Institute B
    foundA?.updateDetails({ name: 'Tenant A Updated Name' });
    await repository.update(foundA!);

    const reloadedB = await repository.findById(instB.id);
    expect(reloadedB?.name).toBe('Tenant B Institute');
  });
});
