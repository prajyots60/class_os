import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { BatchEntity, type BatchStatus } from '../../domain/entities/batch.entity';
import { InstituteMembershipEntity } from '../../domain/entities/institute-membership.entity';
import { ProgramEntity } from '../../domain/entities/program.entity';
import { ProgramSubjectEntity } from '../../domain/entities/program-subject.entity';
import { SubjectEntity } from '../../domain/entities/subject.entity';
import type { BatchRepository, ListBatchesOptions } from '../../domain/repositories/batch.repository';
import type { InstituteMembershipRepository } from '../../domain/repositories/institute-membership.repository';
import type { ProgramRepository } from '../../domain/repositories/program.repository';
import type { ProgramSubjectRepository } from '../../domain/repositories/program-subject.repository';
import type { SubjectRepository } from '../../domain/repositories/subject.repository';
import type { TenantContext } from './membership.use-cases';
import {
  CreateBatchUseCase,
  GetBatchUseCase,
  ListBatchesUseCase,
  UpdateBatchUseCase,
  AssignBatchTeacherUseCase,
  ChangeBatchStatusUseCase,
  ArchiveBatchUseCase,
} from './batch.use-cases';

class InMemoryBatchRepository implements BatchRepository {
  public batches: BatchEntity[] = [];

  public async create(entity: BatchEntity): Promise<BatchEntity> {
    const existingCode = this.batches.find(
      (b) => b.instituteId === entity.instituteId && b.code.value === entity.code.value,
    );
    if (existingCode) {
      throw new ConflictError(
        `A batch with code "${entity.code.value}" already exists in institute "${entity.instituteId}".`,
      );
    }

    const existingNameSubj = this.batches.find(
      (b) =>
        b.instituteId === entity.instituteId &&
        b.subjectId === entity.subjectId &&
        b.name.toLowerCase() === entity.name.toLowerCase(),
    );
    if (existingNameSubj) {
      throw new ConflictError(
        `A batch with name "${entity.name}" already exists for subject in institute "${entity.instituteId}".`,
      );
    }

    this.batches.push(entity);
    return entity;
  }

  public async findById(instituteId: string, id: string): Promise<BatchEntity | null> {
    return this.batches.find((b) => b.instituteId === instituteId && b.id === id) || null;
  }

  public async findByCode(instituteId: string, code: string): Promise<BatchEntity | null> {
    return (
      this.batches.find((b) => b.instituteId === instituteId && b.code.value === code.toUpperCase().trim()) || null
    );
  }

  public async findByNameAndSubject(
    instituteId: string,
    subjectId: string,
    name: string,
  ): Promise<BatchEntity | null> {
    return (
      this.batches.find(
        (b) =>
          b.instituteId === instituteId &&
          b.subjectId === subjectId &&
          b.name.toLowerCase() === name.trim().toLowerCase(),
      ) || null
    );
  }

  public async listByInstitute(instituteId: string, options?: ListBatchesOptions): Promise<BatchEntity[]> {
    return this.batches.filter((b) => {
      if (b.instituteId !== instituteId) return false;
      if (options?.status && b.status !== options.status) return false;
      if (options?.subjectId && b.subjectId !== options.subjectId) return false;
      if (options?.programId && b.programId !== options.programId) return false;
      if (options?.teacherId && b.teacherId !== options.teacherId) return false;
      if (options?.search) {
        const term = options.search.toLowerCase();
        const matches = b.name.toLowerCase().includes(term) || b.code.value.toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }

  public async update(entity: BatchEntity): Promise<BatchEntity> {
    const idx = this.batches.findIndex((b) => b.instituteId === entity.instituteId && b.id === entity.id);
    if (idx === -1) {
      throw new NotFoundError(`Batch "${entity.id}" not found.`);
    }
    this.batches[idx] = entity;
    return entity;
  }

  public async existsByCode(instituteId: string, code: string): Promise<boolean> {
    return this.batches.some(
      (b) => b.instituteId === instituteId && b.code.value === code.toUpperCase().trim(),
    );
  }

  public async existsByNameAndSubject(instituteId: string, subjectId: string, name: string): Promise<boolean> {
    return this.batches.some(
      (b) =>
        b.instituteId === instituteId &&
        b.subjectId === subjectId &&
        b.name.toLowerCase() === name.trim().toLowerCase(),
    );
  }
}

class MockSubjectRepo implements Partial<SubjectRepository> {
  public subjects: SubjectEntity[] = [];
  public async findById(instituteId: string, id: string): Promise<SubjectEntity | null> {
    return this.subjects.find((s) => s.instituteId === instituteId && s.id === id) || null;
  }
}

class MockProgramRepo implements Partial<ProgramRepository> {
  public programs: ProgramEntity[] = [];
  public async findById(instituteId: string, id: string): Promise<ProgramEntity | null> {
    return this.programs.find((p) => p.instituteId === instituteId && p.id === id) || null;
  }
}

class MockProgramSubjectRepo implements Partial<ProgramSubjectRepository> {
  public mappings: ProgramSubjectEntity[] = [];
  public async existsByPair(instituteId: string, programId: string, subjectId: string): Promise<boolean> {
    return this.mappings.some(
      (m) => m.instituteId === instituteId && m.programId === programId && m.subjectId === subjectId,
    );
  }
}

class MockMembershipRepo implements Partial<InstituteMembershipRepository> {
  public memberships: InstituteMembershipEntity[] = [];
  public async findById(id: string): Promise<InstituteMembershipEntity | null> {
    return this.memberships.find((m) => m.id === id) || null;
  }
}

describe('Batch Application Use Cases Suite', () => {
  let batchRepo: InMemoryBatchRepository;
  let subjectRepo: MockSubjectRepo;
  let programRepo: MockProgramRepo;
  let programSubjectRepo: MockProgramSubjectRepo;
  let membershipRepo: MockMembershipRepo;

  let instA: string;
  let instB: string;
  let ownerContextA: TenantContext;
  let teacherContextA: TenantContext;

  let subjectA: SubjectEntity;
  let programA: ProgramEntity;
  let teacherMembership: InstituteMembershipEntity;
  let parentMembership: InstituteMembershipEntity;

  beforeEach(() => {
    batchRepo = new InMemoryBatchRepository();
    subjectRepo = new MockSubjectRepo();
    programRepo = new MockProgramRepo();
    programSubjectRepo = new MockProgramSubjectRepo();
    membershipRepo = new MockMembershipRepo();

    instA = crypto.randomUUID();
    instB = crypto.randomUUID();

    ownerContextA = {
      instituteId: instA,
      userId: crypto.randomUUID(),
      membershipId: crypto.randomUUID(),
      role: 'owner',
      status: 'active',
    };

    teacherContextA = {
      instituteId: instA,
      userId: crypto.randomUUID(),
      membershipId: crypto.randomUUID(),
      role: 'teacher',
      status: 'active',
    };

    subjectA = SubjectEntity.create({ instituteId: instA, name: 'Physics', code: 'PHY-101' });
    programA = ProgramEntity.create({ instituteId: instA, name: 'JEE 2027', code: 'JEE-27' });
    subjectRepo.subjects.push(subjectA);
    programRepo.programs.push(programA);

    teacherMembership = InstituteMembershipEntity.create({
      userId: crypto.randomUUID(),
      instituteId: instA,
      role: 'teacher',
      status: 'active',
    });

    parentMembership = InstituteMembershipEntity.create({
      userId: crypto.randomUUID(),
      instituteId: instA,
      role: 'parent',
      status: 'active',
    });

    membershipRepo.memberships.push(teacherMembership, parentMembership);
  });

  describe('CreateBatchUseCase', () => {
    it('creates a batch in draft state without program or teacher', async () => {
      const useCase = new CreateBatchUseCase(
        batchRepo,
        subjectRepo as unknown as SubjectRepository,
      );

      const dto = await useCase.execute(ownerContextA, {
        subjectId: subjectA.id,
        name: 'Morning Batch A',
        code: 'PHY-MORN-A',
        capacity: 30,
      });

      expect(dto.id).toBeDefined();
      expect(dto.instituteId).toBe(instA);
      expect(dto.subjectId).toBe(subjectA.id);
      expect(dto.name).toBe('Morning Batch A');
      expect(dto.status).toBe('draft');
      expect(dto.capacity).toBe(30);
    });

    it('enforces ProgramSubject mapping check (ACADEMIC-14)', async () => {
      const useCase = new CreateBatchUseCase(
        batchRepo,
        subjectRepo as unknown as SubjectRepository,
        programRepo as unknown as ProgramRepository,
        programSubjectRepo as unknown as ProgramSubjectRepository,
      );

      // Attempting to attach programA when subjectA is not mapped to programA
      await expect(
        useCase.execute(ownerContextA, {
          subjectId: subjectA.id,
          programId: programA.id,
          name: 'Batch with Unmapped Program',
          code: 'BATCH-ERR',
        }),
      ).rejects.toThrow(ValidationError);

      // Now map subjectA to programA
      programSubjectRepo.mappings.push(
        ProgramSubjectEntity.createVerified({
          instituteId: instA,
          programId: programA.id,
          programInstituteId: instA,
          subjectId: subjectA.id,
          subjectInstituteId: instA,
        }),
      );

      const dto = await useCase.execute(ownerContextA, {
        subjectId: subjectA.id,
        programId: programA.id,
        name: 'Batch with Mapped Program',
        code: 'BATCH-OK',
      });

      expect(dto.programId).toBe(programA.id);
    });

    it('enforces teacher role check (ACADEMIC-05)', async () => {
      const useCase = new CreateBatchUseCase(
        batchRepo,
        subjectRepo as unknown as SubjectRepository,
        programRepo as unknown as ProgramRepository,
        programSubjectRepo as unknown as ProgramSubjectRepository,
        membershipRepo as unknown as InstituteMembershipRepository,
      );

      // Reject parent role membership as teacher
      await expect(
        useCase.execute(ownerContextA, {
          subjectId: subjectA.id,
          teacherId: parentMembership.id,
          name: 'Parent Teacher Batch',
          code: 'BATCH-PARENT',
        }),
      ).rejects.toThrow(ValidationError);

      // Accept teacher role membership
      const dto = await useCase.execute(ownerContextA, {
        subjectId: subjectA.id,
        teacherId: teacherMembership.id,
        name: 'Teacher Batch',
        code: 'BATCH-TEACH',
      });

      expect(dto.teacherId).toBe(teacherMembership.id);
    });
  });

  describe('Batch State Transitions (ChangeBatchStatusUseCase)', () => {
    it('executes valid state machine transitions: draft -> open -> running -> completed -> archived', async () => {
      const createUseCase = new CreateBatchUseCase(batchRepo, subjectRepo as unknown as SubjectRepository);
      const created = await createUseCase.execute(ownerContextA, {
        subjectId: subjectA.id,
        name: 'State Transition Batch',
        code: 'STATE-01',
      });

      expect(created.status).toBe('draft');

      const statusUseCase = new ChangeBatchStatusUseCase(batchRepo);

      // draft -> open
      const openBatch = await statusUseCase.execute(ownerContextA, { id: created.id, status: 'open' });
      expect(openBatch.status).toBe('open');

      // open -> running (teacher can also change batch status/progress)
      const runningBatch = await statusUseCase.execute(teacherContextA, { id: created.id, status: 'running' });
      expect(runningBatch.status).toBe('running');

      // running -> completed
      const completedBatch = await statusUseCase.execute(ownerContextA, { id: created.id, status: 'completed' });
      expect(completedBatch.status).toBe('completed');

      // completed -> archived
      const archiveUseCase = new ArchiveBatchUseCase(batchRepo);
      const archivedBatch = await archiveUseCase.execute(ownerContextA, { id: created.id });
      expect(archivedBatch.status).toBe('archived');
      expect(archivedBatch.deletedAt).not.toBeNull();
    });

    it('rejects illegal transition: draft -> running directly', async () => {
      const createUseCase = new CreateBatchUseCase(batchRepo, subjectRepo as unknown as SubjectRepository);
      const created = await createUseCase.execute(ownerContextA, {
        subjectId: subjectA.id,
        name: 'Direct Running Batch',
        code: 'STATE-02',
      });

      const statusUseCase = new ChangeBatchStatusUseCase(batchRepo);
      await expect(
        statusUseCase.execute(ownerContextA, { id: created.id, status: 'running' }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('AssignBatchTeacherUseCase', () => {
    it('assigns and updates primary teacher', async () => {
      const createUseCase = new CreateBatchUseCase(batchRepo, subjectRepo as unknown as SubjectRepository);
      const created = await createUseCase.execute(ownerContextA, {
        subjectId: subjectA.id,
        name: 'Teacher Assignment Test',
        code: 'TEACH-01',
      });

      const assignUseCase = new AssignBatchTeacherUseCase(batchRepo, membershipRepo as unknown as InstituteMembershipRepository);
      const updated = await assignUseCase.execute(ownerContextA, {
        id: created.id,
        teacherId: teacherMembership.id,
      });

      expect(updated.teacherId).toBe(teacherMembership.id);

      // Unassign teacher
      const unassigned = await assignUseCase.execute(ownerContextA, {
        id: created.id,
        teacherId: null,
      });
      expect(unassigned.teacherId).toBeNull();
    });
  });
});
