import {
  cleanTestDatabase,
  closeTestPool,
  db,
  validateTestEnvironment,
} from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BatchEntity } from '../../domain/entities/batch.entity';
import { PrismaBatchRepository } from './prisma-batch.repository';

describe('PrismaBatchRepository Integration Suite', () => {
  let repository: PrismaBatchRepository;

  let instituteA_Id: string;
  let instituteB_Id: string;
  let subjectA_Id: string;
  let programA_Id: string;
  let teacherMembershipA_Id: string;

  beforeAll(() => {
    validateTestEnvironment();
    repository = new PrismaBatchRepository();
  });

  beforeEach(async () => {
    await cleanTestDatabase();

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

    const subjA = await db.subject.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        name: 'Physics',
        code: 'PHY-101',
      },
    });
    subjectA_Id = subjA.id;

    const progA = await db.program.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        name: 'JEE Mains 2027',
        code: 'JEE-2027',
      },
    });
    programA_Id = progA.id;

    // Create ParentIdentity and InstituteParent & InstituteMembership for teacher fixture
    const parentId = crypto.randomUUID();
    await db.parentIdentity.create({
      data: {
        id: parentId,
        phone: '+919876543210',
        name: 'Dr. Teacher Sharma',
      },
    });

    const instParent = await db.instituteParent.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        parentIdentityId: parentId,
      },
    });

    const membership = await db.instituteMembership.create({
      data: {
        id: crypto.randomUUID(),
        parentIdentityId: parentId,
        instituteId: instituteA_Id,
        instituteParentId: instParent.id,
      },
    });
    teacherMembershipA_Id = membership.id;
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('1. creates and persists a Batch record in PostgreSQL', async () => {
    const batch = BatchEntity.create({
      instituteId: instituteA_Id,
      subjectId: subjectA_Id,
      programId: programA_Id,
      teacherId: teacherMembershipA_Id,
      name: 'Morning Batch 1',
      code: 'BATCH-M1',
      capacity: 35,
    });

    const saved = await repository.create(batch);

    expect(saved.id).toBe(batch.id);
    expect(saved.instituteId).toBe(instituteA_Id);
    expect(saved.subjectId).toBe(subjectA_Id);
    expect(saved.programId).toBe(programA_Id);
    expect(saved.teacherId).toBe(teacherMembershipA_Id);
    expect(saved.name).toBe('Morning Batch 1');
    expect(saved.code.value).toBe('BATCH-M1');
    expect(saved.capacity).toBe(35);
    expect(saved.status).toBe('draft');

    const dbRecord = await db.batch.findUnique({
      where: { id: batch.id },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.code).toBe('BATCH-M1');
  });

  it('2. STRICT PHASE 1.11 BOUNDARY CHECK: verifies Batch table and entity contain NO student/enrollment references', async () => {
    const batch = BatchEntity.create({
      instituteId: instituteA_Id,
      subjectId: subjectA_Id,
      name: 'Batch Boundary Test',
      code: 'BATCH-BOUND',
    });
    const saved = await repository.create(batch);

    const dbRecord = (await db.batch.findUnique({
      where: { id: saved.id },
    })) as unknown as Record<string, unknown>;

    expect(dbRecord.studentId).toBeUndefined();
    expect(dbRecord.studentIds).toBeUndefined();
    expect(dbRecord.enrollmentId).toBeUndefined();
  });

  it('3. ENFORCES UNIQUE(institute_id, code) & UNIQUE(institute_id, subject_id, name): throws ConflictError on duplicates', async () => {
    const batch1 = BatchEntity.create({
      instituteId: instituteA_Id,
      subjectId: subjectA_Id,
      name: 'Morning Batch A',
      code: 'BATCH-A1',
    });
    await repository.create(batch1);

    // Duplicate code
    const batchDupCode = BatchEntity.create({
      instituteId: instituteA_Id,
      subjectId: subjectA_Id,
      name: 'Evening Batch B',
      code: 'BATCH-A1',
    });
    await expect(repository.create(batchDupCode)).rejects.toThrow(ConflictError);

    // Duplicate (subjectId, name)
    const batchDupName = BatchEntity.create({
      instituteId: instituteA_Id,
      subjectId: subjectA_Id,
      name: 'Morning Batch A',
      code: 'BATCH-DIFF',
    });
    await expect(repository.create(batchDupName)).rejects.toThrow(ConflictError);
  });

  it('4. ENFORCES TENANT ISOLATION for batch lookups', async () => {
    const batchA = BatchEntity.create({
      instituteId: instituteA_Id,
      subjectId: subjectA_Id,
      name: 'Alpha Batch',
      code: 'BATCH-ALPHA',
    });
    await repository.create(batchA);

    expect(await repository.findById(instituteA_Id, batchA.id)).not.toBeNull();
    expect(await repository.findById(instituteB_Id, batchA.id)).toBeNull();
    expect(await repository.findByCode(instituteB_Id, 'BATCH-ALPHA')).toBeNull();
  });

  it('5. transitions batch status and updates teacher assignment in PostgreSQL', async () => {
    const batch = BatchEntity.create({
      instituteId: instituteA_Id,
      subjectId: subjectA_Id,
      name: 'Beta Batch',
      code: 'BATCH-BETA',
    });
    await repository.create(batch);

    batch.open();
    batch.start();
    batch.assignTeacher(teacherMembershipA_Id);

    const updated = await repository.update(batch);
    expect(updated.status).toBe('running');
    expect(updated.teacherId).toBe(teacherMembershipA_Id);
  });
});
