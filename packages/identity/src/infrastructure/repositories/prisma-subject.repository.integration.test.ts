import {
  cleanTestDatabase,
  closeTestPool,
  db,
  validateTestEnvironment,
} from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SubjectEntity } from '../../domain/entities/subject.entity';
import { PrismaSubjectRepository } from './prisma-subject.repository';

describe('PrismaSubjectRepository Integration Suite', () => {
  let repository: PrismaSubjectRepository;

  let instituteA_Id: string;
  let instituteB_Id: string;

  beforeAll(() => {
    validateTestEnvironment();
    repository = new PrismaSubjectRepository();
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
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('1. creates and persists an independent Subject aggregate in PostgreSQL', async () => {
    const subject = SubjectEntity.create({
      instituteId: instituteA_Id,
      name: 'Physics',
      code: 'PHY-101',
      description: 'General Physics',
    });

    const saved = await repository.create(subject);

    expect(saved.id).toBe(subject.id);
    expect(saved.instituteId).toBe(instituteA_Id);
    expect(saved.name).toBe('Physics');
    expect(saved.code.value).toBe('PHY-101');
    expect(saved.status).toBe('draft');

    const dbRecord = await db.subject.findUnique({
      where: { id: subject.id },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.code).toBe('PHY-101');
  });

  it('2. ENFORCES UNIQUE(institute_id, code): blocks duplicate code in same institute with ConflictError', async () => {
    const subj1 = SubjectEntity.create({
      instituteId: instituteA_Id,
      name: 'Physics I',
      code: 'PHY-101',
    });
    await repository.create(subj1);

    const subj2 = SubjectEntity.create({
      instituteId: instituteA_Id,
      name: 'Physics II',
      code: 'PHY-101',
    });

    await expect(repository.create(subj2)).rejects.toThrow(ConflictError);
  });

  it('3. ALLOWS SAME code in MULTIPLE institutes', async () => {
    const subjA = SubjectEntity.create({
      instituteId: instituteA_Id,
      name: 'Chemistry',
      code: 'CHEM-101',
    });
    const savedA = await repository.create(subjA);

    const subjB = SubjectEntity.create({
      instituteId: instituteB_Id,
      name: 'Chemistry',
      code: 'CHEM-101',
    });
    const savedB = await repository.create(subjB);

    expect(savedA.id).not.toBe(savedB.id);
    expect(savedA.instituteId).toBe(instituteA_Id);
    expect(savedB.instituteId).toBe(instituteB_Id);
  });

  it('4. ENFORCES TENANT ISOLATION for lookups and exists checks', async () => {
    const subjA = SubjectEntity.create({
      instituteId: instituteA_Id,
      name: 'Mathematics',
      code: 'MATH-101',
    });
    await repository.create(subjA);

    expect(await repository.findById(instituteA_Id, subjA.id)).not.toBeNull();
    expect(await repository.findById(instituteB_Id, subjA.id)).toBeNull();
    expect(await repository.existsByCode(instituteA_Id, 'MATH-101')).toBe(true);
    expect(await repository.existsByCode(instituteB_Id, 'MATH-101')).toBe(false);
  });
});
