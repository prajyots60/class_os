import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
} from '@coaching-os/database';
import { AuthorizationError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { InstituteEntity } from '../../domain/entities/institute.entity';
import { PrismaInstituteRepository } from './prisma-institute.repository';
import {
  GetInstituteSettingsUseCase,
  UpdateInstituteSettingsUseCase,
} from '../../application/use-cases/settings.use-cases';
import type { TenantContext } from '../../application/use-cases/membership.use-cases';

describe('Prisma Institute Settings Use Cases Integration & Multi-Tenant Isolation Suite', () => {
  let repository: PrismaInstituteRepository;
  let getUseCase: GetInstituteSettingsUseCase;
  let updateUseCase: UpdateInstituteSettingsUseCase;

  beforeAll(() => {
    validateTestEnvironment();
    repository = new PrismaInstituteRepository();
    getUseCase = new GetInstituteSettingsUseCase(repository);
    updateUseCase = new UpdateInstituteSettingsUseCase(repository);
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('retrieves and updates institute settings in real PostgreSQL database', async () => {
    const inst = await repository.create(
      InstituteEntity.create({
        name: 'Apex Academy',
        slug: 'apex-academy',
        phone: '+919876543210',
        email: 'info@apex.com',
        timezone: 'Asia/Kolkata',
      }),
    );

    const ownerContext: TenantContext = {
      userId: 'usr_owner_1',
      instituteId: inst.id,
      membershipId: 'mem_owner_1',
      role: 'owner',
      status: 'active',
    };

    // 1. Get Settings
    const settingsBefore = await getUseCase.execute({ tenantContext: ownerContext });
    expect(settingsBefore.name).toBe('Apex Academy');
    expect(settingsBefore.primaryColor).toBeNull();
    expect(settingsBefore.logoUrl).toBeNull();

    // 2. Update Settings (including Branding)
    const updated = await updateUseCase.execute({
      tenantContext: ownerContext,
      details: {
        name: 'Apex Learning Institute',
        phone: '+919876543999',
        email: 'admin@apexlearning.com',
        primaryColor: '#0F172A',
        logoUrl: 'https://cdn.apexlearning.com/brand-logo.png',
        timezone: 'Asia/Kolkata',
      },
    });

    expect(updated.name).toBe('Apex Learning Institute');
    expect(updated.phone).toBe('+919876543999');
    expect(updated.email).toBe('admin@apexlearning.com');
    expect(updated.primaryColor).toBe('#0F172A');
    expect(updated.logoUrl).toBe('https://cdn.apexlearning.com/brand-logo.png');

    // 3. Re-query database to ensure real persistence
    const reloaded = await getUseCase.execute({ tenantContext: ownerContext });
    expect(reloaded.name).toBe('Apex Learning Institute');
    expect(reloaded.primaryColor).toBe('#0F172A');
    expect(reloaded.logoUrl).toBe('https://cdn.apexlearning.com/brand-logo.png');
  });

  it('STRICT MULTI-TENANT ISOLATION: updates to Tenant A do not affect Tenant B', async () => {
    const instA = await repository.create(
      InstituteEntity.create({
        name: 'Tenant A Institute',
        slug: 'tenant-a-inst',
        phone: '+919800000001',
        email: 'tenanta@test.com',
        primaryColor: '#111111',
      }),
    );

    const instB = await repository.create(
      InstituteEntity.create({
        name: 'Tenant B Institute',
        slug: 'tenant-b-inst',
        phone: '+919800000002',
        email: 'tenantb@test.com',
        primaryColor: '#222222',
      }),
    );

    const ownerA: TenantContext = {
      userId: 'usr_a',
      instituteId: instA.id,
      membershipId: 'mem_a',
      role: 'owner',
      status: 'active',
    };

    const ownerB: TenantContext = {
      userId: 'usr_b',
      instituteId: instB.id,
      membershipId: 'mem_b',
      role: 'owner',
      status: 'active',
    };

    // Update Tenant A
    await updateUseCase.execute({
      tenantContext: ownerA,
      details: {
        name: 'Tenant A Modified',
        primaryColor: '#AAAAAA',
      },
    });

    // Verify Tenant B remains unchanged in PostgreSQL
    const settingsB = await getUseCase.execute({ tenantContext: ownerB });
    expect(settingsB.name).toBe('Tenant B Institute');
    expect(settingsB.primaryColor).toBe('#222222');
  });

  it('AUTHORIZATION GUARD: denies unauthorized updates and prevents database modification', async () => {
    const inst = await repository.create(
      InstituteEntity.create({
        name: 'Secure Institute',
        slug: 'secure-inst',
        phone: '+919800000000',
        email: 'secure@test.com',
      }),
    );

    const teacherContext: TenantContext = {
      userId: 'usr_teacher',
      instituteId: inst.id,
      membershipId: 'mem_teacher',
      role: 'teacher',
      status: 'active',
    };

    await expect(
      updateUseCase.execute({
        tenantContext: teacherContext,
        details: { name: 'Hacked Name' },
      }),
    ).rejects.toThrow(AuthorizationError);

    // Verify database was not changed
    const ownerContext: TenantContext = {
      userId: 'usr_owner',
      instituteId: inst.id,
      membershipId: 'mem_owner',
      role: 'owner',
      status: 'active',
    };
    const settings = await getUseCase.execute({ tenantContext: ownerContext });
    expect(settings.name).toBe('Secure Institute');
  });
});
