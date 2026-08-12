import {
  cleanTestDatabase,
  closeTestPool,
  db,
  validateTestEnvironment,
} from '@coaching-os/database';
import { ConflictError, ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ProgramSubjectEntity } from '../../domain/entities/program-subject.entity';
import { PrismaProgramSubjectRepository } from './prisma-program-subject.repository';

describe('PrismaProgramSubjectRepository Integration Suite', () => {
  let repository: PrismaProgramSubjectRepository;

  let instituteA_Id: string;
  let instituteB_Id: string;
  let programA_Id: string;
  let subjectA_Id: string;

  beforeAll(() => {
    validateTestEnvironment();
    repository = new PrismaProgramSubjectRepository();
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

    const progA = await db.program.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        name: 'JEE Mains 2027',
        code: 'JEE-2027',
      },
    });
    programA_Id = progA.id;

    const subjA = await db.subject.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        name: 'Physics',
        code: 'PHY-101',
      },
    });
    subjectA_Id = subjA.id;
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('1. creates and persists a ProgramSubject mapping in PostgreSQL', async () => {
    const ps = ProgramSubjectEntity.create({
      instituteId: instituteA_Id,
      programId: programA_Id,
      subjectId: subjectA_Id,
    });

    const saved = await repository.create(ps);

    expect(saved.id).toBe(ps.id);
    expect(saved.instituteId).toBe(instituteA_Id);
    expect(saved.programId).toBe(programA_Id);
    expect(saved.subjectId).toBe(subjectA_Id);

    const dbRecord = await db.programSubject.findUnique({
      where: { id: ps.id },
    });
    expect(dbRecord).not.toBeNull();
  });

  it('2. ENFORCES UNIQUE(institute_id, program_id, subject_id): throws ConflictError on duplicate mapping', async () => {
    const ps1 = ProgramSubjectEntity.create({
      instituteId: instituteA_Id,
      programId: programA_Id,
      subjectId: subjectA_Id,
    });
    await repository.create(ps1);

    const ps2 = ProgramSubjectEntity.create({
      instituteId: instituteA_Id,
      programId: programA_Id,
      subjectId: subjectA_Id,
    });

    await expect(repository.create(ps2)).rejects.toThrow(ConflictError);
  });

  it('3. deletes mapping by pair and checks existence', async () => {
    const ps = ProgramSubjectEntity.create({
      instituteId: instituteA_Id,
      programId: programA_Id,
      subjectId: subjectA_Id,
    });
    await repository.create(ps);

    expect(await repository.existsByPair(instituteA_Id, programA_Id, subjectA_Id)).toBe(true);

    const deleted = await repository.deleteByPair(instituteA_Id, programA_Id, subjectA_Id);
    expect(deleted).toBe(true);

    expect(await repository.existsByPair(instituteA_Id, programA_Id, subjectA_Id)).toBe(false);
  });

  it('4. ENFORCES TENANT ISOLATION: Institute B cannot find Institute A program-subject mapping', async () => {
    const ps = ProgramSubjectEntity.create({
      instituteId: instituteA_Id,
      programId: programA_Id,
      subjectId: subjectA_Id,
    });
    await repository.create(ps);

    expect(await repository.findByPair(instituteB_Id, programA_Id, subjectA_Id)).toBeNull();
  });
});
