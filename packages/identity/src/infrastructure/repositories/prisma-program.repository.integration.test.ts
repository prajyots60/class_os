import {
  cleanTestDatabase,
  closeTestPool,
  db,
  validateTestEnvironment,
} from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ProgramEntity } from '../../domain/entities/program.entity';
import { PrismaProgramRepository } from './prisma-program.repository';

describe('PrismaProgramRepository Integration Suite', () => {
  let repository: PrismaProgramRepository;

  let instituteA_Id: string;
  let instituteB_Id: string;

  beforeAll(() => {
    validateTestEnvironment();
    repository = new PrismaProgramRepository();
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

  it('1. creates and persists a Program record in PostgreSQL', async () => {
    const program = ProgramEntity.create({
      instituteId: instituteA_Id,
      name: 'JEE Mains 2027',
      code: 'JEE-2027',
      description: 'Comprehensive 2-year preparation',
    });

    const saved = await repository.create(program);

    expect(saved.id).toBe(program.id);
    expect(saved.instituteId).toBe(instituteA_Id);
    expect(saved.name).toBe('JEE Mains 2027');
    expect(saved.code.value).toBe('JEE-2027');
    expect(saved.status).toBe('draft');

    const dbRecord = await db.program.findUnique({
      where: { id: program.id },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.code).toBe('JEE-2027');
  });

  it('2. ENFORCES UNIQUE(institute_id, code): blocks duplicate code in same institute with ConflictError', async () => {
    const prog1 = ProgramEntity.create({
      instituteId: instituteA_Id,
      name: 'JEE Mains 2027',
      code: 'JEE-2027',
    });
    await repository.create(prog1);

    const prog2 = ProgramEntity.create({
      instituteId: instituteA_Id,
      name: 'JEE Mains Advanced 2027',
      code: 'JEE-2027', // SAME code!
    });

    await expect(repository.create(prog2)).rejects.toThrow(ConflictError);
  });

  it('3. ALLOWS SAME code in MULTIPLE institutes (Multi-Tenant Scoped Uniqueness)', async () => {
    const progA = ProgramEntity.create({
      instituteId: instituteA_Id,
      name: 'JEE Mains 2027',
      code: 'JEE-2027',
    });
    const savedA = await repository.create(progA);

    const progB = ProgramEntity.create({
      instituteId: instituteB_Id,
      name: 'JEE Mains 2027',
      code: 'JEE-2027',
    });
    const savedB = await repository.create(progB);

    expect(savedA.id).not.toBe(savedB.id);
    expect(savedA.instituteId).toBe(instituteA_Id);
    expect(savedB.instituteId).toBe(instituteB_Id);
  });

  it('4. ENFORCES TENANT ISOLATION: Institute B cannot look up Institute A program', async () => {
    const progA = ProgramEntity.create({
      instituteId: instituteA_Id,
      name: 'NEET 2027',
      code: 'NEET-2027',
    });
    await repository.create(progA);

    expect(await repository.findById(instituteA_Id, progA.id)).not.toBeNull();
    expect(await repository.findById(instituteB_Id, progA.id)).toBeNull();
    expect(await repository.findByCode(instituteB_Id, 'NEET-2027')).toBeNull();
  });

  it('5. updates program status and profile within tenant context', async () => {
    const prog = ProgramEntity.create({
      instituteId: instituteA_Id,
      name: 'Foundation Class 10',
      code: 'FOUNDATION-10',
    });
    await repository.create(prog);

    prog.activate();
    prog.updateProfile({ description: 'Updated description' });

    const updated = await repository.update(prog);
    expect(updated.status).toBe('active');
    expect(updated.description).toBe('Updated description');
  });

  it('6. throws ValidationError when creating program with invalid institute ID', async () => {
    const fakeInstId = crypto.randomUUID();
    const program = ProgramEntity.create({
      instituteId: fakeInstId,
      name: 'Test Program',
      code: 'TEST-PROG',
    });

    await expect(repository.create(program)).rejects.toThrow(ValidationError);
  });
});
