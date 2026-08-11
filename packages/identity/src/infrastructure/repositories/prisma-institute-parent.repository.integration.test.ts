import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  db,
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
} from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { InstituteParentEntity } from '../../domain/entities/institute-parent.entity';
import { ParentIdentityEntity } from '../../domain/entities/parent-identity.entity';
import { PrismaInstituteParentRepository } from './prisma-institute-parent.repository';
import { PrismaParentIdentityRepository } from './prisma-parent-identity.repository';
import crypto from 'node:crypto';

describe('PrismaInstituteParentRepository Integration Suite', () => {
  let repository: PrismaInstituteParentRepository;
  let parentIdentityRepository: PrismaParentIdentityRepository;

  // Test Fixtures
  let instituteA_Id: string;
  let instituteB_Id: string;
  let parentIdentity_P1: ParentIdentityEntity;
  let parentIdentity_P2: ParentIdentityEntity;

  beforeAll(() => {
    validateTestEnvironment();
    repository = new PrismaInstituteParentRepository();
    parentIdentityRepository = new PrismaParentIdentityRepository();
  });

  beforeEach(async () => {
    await cleanTestDatabase();

    // Create 2 Test Institutes
    const instA = await db.institute.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Apex Academy Institute A',
        slug: `apex-inst-a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543210',
        email: `inst-a-${Date.now()}-${Math.floor(Math.random() * 1000)}@apex.com`,
      },
    });
    instituteA_Id = instA.id;

    const instB = await db.institute.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Zenith Classes Institute B',
        slug: `zenith-inst-b-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543211',
        email: `inst-b-${Date.now()}-${Math.floor(Math.random() * 1000)}@zenith.com`,
      },
    });
    instituteB_Id = instB.id;

    // Create 2 Global Parent Identities
    parentIdentity_P1 = await parentIdentityRepository.create(
      ParentIdentityEntity.create({
        phone: `+9198765${Math.floor(10000 + Math.random() * 90000)}`,
        name: 'Global Parent 1',
      }),
    );

    parentIdentity_P2 = await parentIdentityRepository.create(
      ParentIdentityEntity.create({
        phone: `+9198766${Math.floor(10000 + Math.random() * 90000)}`,
        name: 'Global Parent 2',
      }),
    );
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('1. creates and persists an InstituteParent CRM record in PostgreSQL', async () => {
    const entity = InstituteParentEntity.create({
      instituteId: instituteA_Id,
      parentIdentityId: parentIdentity_P1.id,
      notes: 'Initial fee discussions',
    });

    const saved = await repository.create(entity);

    expect(saved.id).toBe(entity.id);
    expect(saved.instituteId).toBe(instituteA_Id);
    expect(saved.parentIdentityId).toBe(parentIdentity_P1.id);
    expect(saved.notes).toBe('Initial fee discussions');
    expect(saved.status).toBe('active');

    // Verify raw PostgreSQL table record
    const dbRecord = await db.instituteParent.findUnique({
      where: { id: entity.id },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.instituteId).toBe(instituteA_Id);
    expect(dbRecord?.parentIdentityId).toBe(parentIdentity_P1.id);
    expect(dbRecord?.notes).toBe('Initial fee discussions');
  });

  it('2. ENFORCES UNIQUE(institute_id, parent_identity_id): blocks duplicate CRM record in same institute with ConflictError', async () => {
    const crmRecord1 = InstituteParentEntity.create({
      instituteId: instituteA_Id,
      parentIdentityId: parentIdentity_P1.id,
      notes: 'First CRM record',
    });
    await repository.create(crmRecord1);

    const crmRecord2 = InstituteParentEntity.create({
      instituteId: instituteA_Id, // SAME institute
      parentIdentityId: parentIdentity_P1.id, // SAME global parent
      notes: 'Duplicate CRM record attempt',
    });

    await expect(repository.create(crmRecord2)).rejects.toThrow(ConflictError);
  });

  it('3. ALLOWS SAME ParentIdentity in MULTIPLE institutes (Multi-Tenant Identity Linking)', async () => {
    // Parent P1 enrolled in Institute A
    const crmRecordA = InstituteParentEntity.create({
      instituteId: instituteA_Id,
      parentIdentityId: parentIdentity_P1.id,
      notes: 'Parent enrolled in Inst A JEE batch',
    });
    const savedA = await repository.create(crmRecordA);

    // Parent P1 enrolled in Institute B
    const crmRecordB = InstituteParentEntity.create({
      instituteId: instituteB_Id,
      parentIdentityId: parentIdentity_P1.id,
      notes: 'Parent enrolled in Inst B NEET batch',
    });
    const savedB = await repository.create(crmRecordB);

    expect(savedA.id).not.toBe(savedB.id);
    expect(savedA.instituteId).toBe(instituteA_Id);
    expect(savedB.instituteId).toBe(instituteB_Id);
    expect(savedA.parentIdentityId).toBe(parentIdentity_P1.id);
    expect(savedB.parentIdentityId).toBe(parentIdentity_P1.id);
  });

  it('4. ENFORCES TENANT ISOLATION: Institute B cannot look up Institute A record by ID', async () => {
    const crmRecordA = InstituteParentEntity.create({
      instituteId: instituteA_Id,
      parentIdentityId: parentIdentity_P1.id,
      notes: 'Confidential Inst A staff notes',
    });
    await repository.create(crmRecordA);

    // Institute A lookup -> SUCCESS
    const foundByA = await repository.findById(instituteA_Id, crmRecordA.id);
    expect(foundByA).not.toBeNull();
    expect(foundByA?.notes).toBe('Confidential Inst A staff notes');

    // Institute B lookup for same record ID -> RETURNS NULL (Strict Isolation)
    const foundByB = await repository.findById(instituteB_Id, crmRecordA.id);
    expect(foundByB).toBeNull();
  });

  it('5. ENFORCES TENANT ISOLATION: Institute B cannot look up Institute A record by ParentIdentity ID', async () => {
    const crmRecordA = InstituteParentEntity.create({
      instituteId: instituteA_Id,
      parentIdentityId: parentIdentity_P1.id,
    });
    await repository.create(crmRecordA);

    // Institute A lookup -> SUCCESS
    const foundA = await repository.findByParentIdentityId(instituteA_Id, parentIdentity_P1.id);
    expect(foundA).not.toBeNull();
    expect(foundA?.id).toBe(crmRecordA.id);

    // Institute B lookup -> RETURNS NULL
    const foundB = await repository.findByParentIdentityId(instituteB_Id, parentIdentity_P1.id);
    expect(foundB).toBeNull();
  });

  it('6. lists CRM records strictly scoped to institute with optional status filter and pagination', async () => {
    const parentA1 = InstituteParentEntity.create({
      instituteId: instituteA_Id,
      parentIdentityId: parentIdentity_P1.id,
    });
    const parentA2 = InstituteParentEntity.create({
      instituteId: instituteA_Id,
      parentIdentityId: parentIdentity_P2.id,
    });
    const parentB = InstituteParentEntity.create({
      instituteId: instituteB_Id,
      parentIdentityId: parentIdentity_P1.id,
    });

    await repository.create(parentA1);
    await repository.create(parentA2);
    await repository.create(parentB);

    // Mark parentA2 as inactive
    parentA2.changeStatus('inactive');
    await repository.update(parentA2);

    // List Inst A records
    const instAList = await repository.listByInstitute(instituteA_Id);
    expect(instAList).toHaveLength(2);

    // Filter Inst A active records
    const instAActive = await repository.listByInstitute(instituteA_Id, { status: 'active' });
    expect(instAActive).toHaveLength(1);
    expect(instAActive[0].id).toBe(parentA1.id);

    // Filter Inst A inactive records
    const instAInactive = await repository.listByInstitute(instituteA_Id, { status: 'inactive' });
    expect(instAInactive).toHaveLength(1);
    expect(instAInactive[0].id).toBe(parentA2.id);

    // List Inst B records
    const instBList = await repository.listByInstitute(instituteB_Id);
    expect(instBList).toHaveLength(1);
    expect(instBList[0].id).toBe(parentB.id);
  });

  it('7. updates notes and status within tenant context and rejects cross-tenant update', async () => {
    const crmRecordA = InstituteParentEntity.create({
      instituteId: instituteA_Id,
      parentIdentityId: parentIdentity_P1.id,
      notes: 'Initial notes',
    });
    await repository.create(crmRecordA);

    crmRecordA.updateNotes('Updated confidential staff notes');
    crmRecordA.changeStatus('inactive');

    const updated = await repository.update(crmRecordA);
    expect(updated.notes).toBe('Updated confidential staff notes');
    expect(updated.status).toBe('inactive');

    // Attempt to update record under Institute B context
    const maliciousAttempt = InstituteParentEntity.from({
      id: crmRecordA.id,
      instituteId: instituteB_Id, // WRONG TENANT
      parentIdentityId: parentIdentity_P1.id,
      notes: 'Hacked notes',
      status: 'active',
      createdAt: crmRecordA.createdAt,
      updatedAt: new Date(),
    });

    await expect(repository.update(maliciousAttempt)).rejects.toThrow(NotFoundError);
  });

  it('8. checks existence of CRM record for (instituteId, parentIdentityId)', async () => {
    const crmRecord = InstituteParentEntity.create({
      instituteId: instituteA_Id,
      parentIdentityId: parentIdentity_P1.id,
    });
    await repository.create(crmRecord);

    expect(await repository.exists(instituteA_Id, parentIdentity_P1.id)).toBe(true);
    expect(await repository.exists(instituteB_Id, parentIdentity_P1.id)).toBe(false);
    expect(await repository.exists(instituteA_Id, parentIdentity_P2.id)).toBe(false);
  });

  it('9. PROTECTS GLOBAL ParentIdentity: mutating InstituteParent does NOT touch ParentIdentity', async () => {
    const crmRecord = InstituteParentEntity.create({
      instituteId: instituteA_Id,
      parentIdentityId: parentIdentity_P1.id,
      notes: 'Notes mutation test',
    });
    await repository.create(crmRecord);

    // Mutate and update InstituteParent
    crmRecord.updateNotes('New staff notes');
    crmRecord.changeStatus('inactive');
    await repository.update(crmRecord);

    // Verify global ParentIdentity entity in DB is untouched
    const globalParent = await parentIdentityRepository.findById(parentIdentity_P1.id);
    expect(globalParent).not.toBeNull();
    expect(globalParent?.status).toBe('active'); // Still active!
    expect(globalParent?.name).toBe('Global Parent 1');
  });

  it('10. PROTECTS GLOBAL ParentIdentity: foreign key onDelete Restrict prevents deleting ParentIdentity while InstituteParent exists', async () => {
    const crmRecord = InstituteParentEntity.create({
      instituteId: instituteA_Id,
      parentIdentityId: parentIdentity_P1.id,
    });
    await repository.create(crmRecord);

    // Attempting to delete global ParentIdentity while InstituteParent references it must fail via DB constraint
    await expect(parentIdentityRepository.delete(parentIdentity_P1.id)).rejects.toThrow();
  });
});
