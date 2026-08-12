import { AuthorizationError, ConflictError, NotFoundError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProgramEntity } from '../../domain/entities/program.entity';
import { ProgramSubjectEntity } from '../../domain/entities/program-subject.entity';
import { SubjectEntity } from '../../domain/entities/subject.entity';
import type { ProgramRepository } from '../../domain/repositories/program.repository';
import type { ProgramSubjectRepository } from '../../domain/repositories/program-subject.repository';
import type { SubjectRepository } from '../../domain/repositories/subject.repository';
import type { TenantContext } from './membership.use-cases';
import {
  CreateProgramSubjectUseCase,
  GetProgramSubjectUseCase,
  ListProgramSubjectsByProgramUseCase,
  ListProgramSubjectsBySubjectUseCase,
  DeleteProgramSubjectUseCase,
} from './program-subject.use-cases';

class InMemoryProgramSubjectRepository implements ProgramSubjectRepository {
  public mappings: ProgramSubjectEntity[] = [];

  public async create(entity: ProgramSubjectEntity): Promise<ProgramSubjectEntity> {
    const existing = this.mappings.find(
      (m) =>
        m.instituteId === entity.instituteId &&
        m.programId === entity.programId &&
        m.subjectId === entity.subjectId,
    );
    if (existing) {
      throw new ConflictError('Mapping already exists.');
    }
    this.mappings.push(entity);
    return entity;
  }

  public async findById(instituteId: string, id: string): Promise<ProgramSubjectEntity | null> {
    return this.mappings.find((m) => m.instituteId === instituteId && m.id === id) || null;
  }

  public async findByPair(
    instituteId: string,
    programId: string,
    subjectId: string,
  ): Promise<ProgramSubjectEntity | null> {
    return (
      this.mappings.find(
        (m) => m.instituteId === instituteId && m.programId === programId && m.subjectId === subjectId,
      ) || null
    );
  }

  public async listByProgramId(instituteId: string, programId: string): Promise<ProgramSubjectEntity[]> {
    return this.mappings.filter((m) => m.instituteId === instituteId && m.programId === programId);
  }

  public async listBySubjectId(instituteId: string, subjectId: string): Promise<ProgramSubjectEntity[]> {
    return this.mappings.filter((m) => m.instituteId === instituteId && m.subjectId === subjectId);
  }

  public async deleteByPair(instituteId: string, programId: string, subjectId: string): Promise<boolean> {
    const idx = this.mappings.findIndex(
      (m) => m.instituteId === instituteId && m.programId === programId && m.subjectId === subjectId,
    );
    if (idx === -1) return false;
    this.mappings.splice(idx, 1);
    return true;
  }

  public async existsByPair(instituteId: string, programId: string, subjectId: string): Promise<boolean> {
    return this.mappings.some(
      (m) => m.instituteId === instituteId && m.programId === programId && m.subjectId === subjectId,
    );
  }
}

class MockProgramRepo implements Partial<ProgramRepository> {
  public programs: ProgramEntity[] = [];
  public async findById(instituteId: string, id: string): Promise<ProgramEntity | null> {
    return this.programs.find((p) => p.instituteId === instituteId && p.id === id) || null;
  }
}

class MockSubjectRepo implements Partial<SubjectRepository> {
  public subjects: SubjectEntity[] = [];
  public async findById(instituteId: string, id: string): Promise<SubjectEntity | null> {
    return this.subjects.find((s) => s.instituteId === instituteId && s.id === id) || null;
  }
}

describe('ProgramSubject Application Use Cases Suite', () => {
  let programSubjectRepo: InMemoryProgramSubjectRepository;
  let programRepo: MockProgramRepo;
  let subjectRepo: MockSubjectRepo;
  let instA: string;
  let instB: string;
  let ownerContextA: TenantContext;
  let parentContextA: TenantContext;

  let programA: ProgramEntity;
  let subjectA: SubjectEntity;
  let programB: ProgramEntity;

  beforeEach(() => {
    programSubjectRepo = new InMemoryProgramSubjectRepository();
    programRepo = new MockProgramRepo();
    subjectRepo = new MockSubjectRepo();

    instA = crypto.randomUUID();
    instB = crypto.randomUUID();

    ownerContextA = {
      instituteId: instA,
      userId: crypto.randomUUID(),
      membershipId: crypto.randomUUID(),
      role: 'owner',
      status: 'active',
    };

    parentContextA = {
      instituteId: instA,
      userId: crypto.randomUUID(),
      membershipId: crypto.randomUUID(),
      role: 'parent',
      status: 'active',
    };

    programA = ProgramEntity.create({ instituteId: instA, name: 'JEE 2027', code: 'JEE-27' });
    subjectA = SubjectEntity.create({ instituteId: instA, name: 'Physics', code: 'PHY-101' });
    programB = ProgramEntity.create({ instituteId: instB, name: 'NEET 2027', code: 'NEET-27' });

    programRepo.programs.push(programA, programB);
    subjectRepo.subjects.push(subjectA);
  });

  describe('CreateProgramSubjectUseCase', () => {
    it('creates a mapping between Program and Subject within tenant', async () => {
      const useCase = new CreateProgramSubjectUseCase(
        programSubjectRepo,
        programRepo as unknown as ProgramRepository,
        subjectRepo as unknown as SubjectRepository,
      );

      const dto = await useCase.execute(ownerContextA, {
        programId: programA.id,
        subjectId: subjectA.id,
      });

      expect(dto.id).toBeDefined();
      expect(dto.programId).toBe(programA.id);
      expect(dto.subjectId).toBe(subjectA.id);
    });

    it('rejects cross-tenant mapping when program belongs to different tenant', async () => {
      const useCase = new CreateProgramSubjectUseCase(
        programSubjectRepo,
        programRepo as unknown as ProgramRepository,
        subjectRepo as unknown as SubjectRepository,
      );

      await expect(
        useCase.execute(ownerContextA, {
          programId: programB.id, // ProgramB belongs to InstB
          subjectId: subjectA.id,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('rejects duplicate mapping', async () => {
      const useCase = new CreateProgramSubjectUseCase(
        programSubjectRepo,
        programRepo as unknown as ProgramRepository,
        subjectRepo as unknown as SubjectRepository,
      );

      await useCase.execute(ownerContextA, {
        programId: programA.id,
        subjectId: subjectA.id,
      });

      await expect(
        useCase.execute(ownerContextA, {
          programId: programA.id,
          subjectId: subjectA.id,
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('rejects creation if user lacks capability', async () => {
      const useCase = new CreateProgramSubjectUseCase(
        programSubjectRepo,
        programRepo as unknown as ProgramRepository,
        subjectRepo as unknown as SubjectRepository,
      );

      await expect(
        useCase.execute(parentContextA, {
          programId: programA.id,
          subjectId: subjectA.id,
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('DeleteProgramSubjectUseCase', () => {
    it('removes mapping successfully', async () => {
      const createUseCase = new CreateProgramSubjectUseCase(
        programSubjectRepo,
        programRepo as unknown as ProgramRepository,
        subjectRepo as unknown as SubjectRepository,
      );
      await createUseCase.execute(ownerContextA, {
        programId: programA.id,
        subjectId: subjectA.id,
      });

      const deleteUseCase = new DeleteProgramSubjectUseCase(programSubjectRepo);
      await deleteUseCase.execute(ownerContextA, {
        programId: programA.id,
        subjectId: subjectA.id,
      });

      expect(programSubjectRepo.mappings).toHaveLength(0);
    });
  });
});
