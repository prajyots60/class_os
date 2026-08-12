import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { BatchEntity } from '../../domain/entities/batch.entity';
import { InstituteMembershipEntity } from '../../domain/entities/institute-membership.entity';
import { ProgramSubjectEntity } from '../../domain/entities/program-subject.entity';
import { ProgramEntity } from '../../domain/entities/program.entity';
import { SubjectEntity } from '../../domain/entities/subject.entity';
import type { BatchRepository } from '../../domain/repositories/batch.repository';
import type { InstituteMembershipRepository } from '../../domain/repositories/institute-membership.repository';
import type { ProgramSubjectRepository } from '../../domain/repositories/program-subject.repository';
import type { ProgramRepository } from '../../domain/repositories/program.repository';
import type { SubjectRepository } from '../../domain/repositories/subject.repository';
import {
  AssignBatchTeacherUseCase,
  ChangeBatchStatusUseCase,
  CreateBatchUseCase,
  GetBatchUseCase,
  UpdateBatchUseCase,
} from './batch.use-cases';
import type { TenantContext } from './membership.use-cases';
import { CreateProgramSubjectUseCase } from './program-subject.use-cases';
import {
  ArchiveProgramUseCase,
  CreateProgramUseCase,
  GetProgramUseCase,
  UpdateProgramUseCase,
} from './program.use-cases';
import {
  ArchiveSubjectUseCase,
  CreateSubjectUseCase,
  GetSubjectUseCase,
  UpdateSubjectUseCase,
} from './subject.use-cases';
import { createProgramSchema } from '../../presentation/validators/program.validator';
import { createSubjectSchema } from '../../presentation/validators/subject.validator';
import { createBatchSchema, updateBatchSchema } from '../../presentation/validators/batch.validator';

// ============================================================================
// In-Memory Test Repositories
// ============================================================================

class InMemoryProgramRepo implements ProgramRepository {
  public programs: ProgramEntity[] = [];

  public async create(entity: ProgramEntity): Promise<ProgramEntity> {
    this.programs.push(entity);
    return entity;
  }

  public async findById(instituteId: string, id: string): Promise<ProgramEntity | null> {
    return this.programs.find((p) => p.instituteId === instituteId && p.id === id) || null;
  }

  public async findByCode(instituteId: string, code: string): Promise<ProgramEntity | null> {
    return (
      this.programs.find(
        (p) => p.instituteId === instituteId && p.code.value === code.toUpperCase().trim(),
      ) || null
    );
  }

  public async findByName(instituteId: string, name: string): Promise<ProgramEntity | null> {
    return (
      this.programs.find(
        (p) => p.instituteId === instituteId && p.name.toLowerCase() === name.trim().toLowerCase(),
      ) || null
    );
  }

  public async listByInstitute(instituteId: string): Promise<ProgramEntity[]> {
    return this.programs.filter((p) => p.instituteId === instituteId);
  }

  public async update(entity: ProgramEntity): Promise<ProgramEntity> {
    const idx = this.programs.findIndex((p) => p.instituteId === entity.instituteId && p.id === entity.id);
    if (idx !== -1) this.programs[idx] = entity;
    return entity;
  }

  public async existsByCode(instituteId: string, code: string): Promise<boolean> {
    return this.programs.some(
      (p) => p.instituteId === instituteId && p.code.value === code.toUpperCase().trim(),
    );
  }

  public async existsByName(instituteId: string, name: string): Promise<boolean> {
    return this.programs.some(
      (p) => p.instituteId === instituteId && p.name.toLowerCase() === name.trim().toLowerCase(),
    );
  }
}

class InMemorySubjectRepo implements SubjectRepository {
  public subjects: SubjectEntity[] = [];

  public async create(entity: SubjectEntity): Promise<SubjectEntity> {
    this.subjects.push(entity);
    return entity;
  }

  public async findById(instituteId: string, id: string): Promise<SubjectEntity | null> {
    return this.subjects.find((s) => s.instituteId === instituteId && s.id === id) || null;
  }

  public async findByCode(instituteId: string, code: string): Promise<SubjectEntity | null> {
    return (
      this.subjects.find(
        (s) => s.instituteId === instituteId && s.code.value === code.toUpperCase().trim(),
      ) || null
    );
  }

  public async findByName(instituteId: string, name: string): Promise<SubjectEntity | null> {
    return (
      this.subjects.find(
        (s) => s.instituteId === instituteId && s.name.toLowerCase() === name.trim().toLowerCase(),
      ) || null
    );
  }

  public async listByInstitute(instituteId: string): Promise<SubjectEntity[]> {
    return this.subjects.filter((s) => s.instituteId === instituteId);
  }

  public async update(entity: SubjectEntity): Promise<SubjectEntity> {
    const idx = this.subjects.findIndex((s) => s.instituteId === entity.instituteId && s.id === entity.id);
    if (idx !== -1) this.subjects[idx] = entity;
    return entity;
  }

  public async existsByCode(instituteId: string, code: string): Promise<boolean> {
    return this.subjects.some(
      (s) => s.instituteId === instituteId && s.code.value === code.toUpperCase().trim(),
    );
  }

  public async existsByName(instituteId: string, name: string): Promise<boolean> {
    return this.subjects.some(
      (s) => s.instituteId === instituteId && s.name.toLowerCase() === name.trim().toLowerCase(),
    );
  }
}

class InMemoryProgramSubjectRepo implements ProgramSubjectRepository {
  public mappings: ProgramSubjectEntity[] = [];

  public async create(entity: ProgramSubjectEntity): Promise<ProgramSubjectEntity> {
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
        (m) =>
          m.instituteId === instituteId &&
          m.programId === programId &&
          m.subjectId === subjectId,
      ) || null
    );
  }

  public async listByInstituteId(instituteId: string): Promise<ProgramSubjectEntity[]> {
    return this.mappings.filter((m) => m.instituteId === instituteId);
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
    if (idx !== -1) {
      this.mappings.splice(idx, 1);
      return true;
    }
    return false;
  }

  public async existsByPair(
    instituteId: string,
    programId: string,
    subjectId: string,
  ): Promise<boolean> {
    return this.mappings.some(
      (m) =>
        m.instituteId === instituteId &&
        m.programId === programId &&
        m.subjectId === subjectId,
    );
  }
}

class InMemoryBatchRepo implements BatchRepository {
  public batches: BatchEntity[] = [];

  public async create(entity: BatchEntity): Promise<BatchEntity> {
    this.batches.push(entity);
    return entity;
  }

  public async findById(instituteId: string, id: string): Promise<BatchEntity | null> {
    return this.batches.find((b) => b.instituteId === instituteId && b.id === id) || null;
  }

  public async findByCode(instituteId: string, code: string): Promise<BatchEntity | null> {
    return (
      this.batches.find(
        (b) => b.instituteId === instituteId && b.code.value === code.toUpperCase().trim(),
      ) || null
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

  public async listByInstitute(instituteId: string): Promise<BatchEntity[]> {
    return this.batches.filter((b) => b.instituteId === instituteId);
  }

  public async update(entity: BatchEntity): Promise<BatchEntity> {
    const idx = this.batches.findIndex((b) => b.instituteId === entity.instituteId && b.id === entity.id);
    if (idx !== -1) this.batches[idx] = entity;
    return entity;
  }

  public async existsByCode(instituteId: string, code: string): Promise<boolean> {
    return this.batches.some(
      (b) => b.instituteId === instituteId && b.code.value === code.toUpperCase().trim(),
    );
  }

  public async existsByNameAndSubject(
    instituteId: string,
    subjectId: string,
    name: string,
  ): Promise<boolean> {
    return this.batches.some(
      (b) =>
        b.instituteId === instituteId &&
        b.subjectId === subjectId &&
        b.name.toLowerCase() === name.trim().toLowerCase(),
    );
  }
}

class InMemoryMembershipRepo implements InstituteMembershipRepository {
  public memberships: InstituteMembershipEntity[] = [];

  public async create(entity: InstituteMembershipEntity): Promise<InstituteMembershipEntity> {
    this.memberships.push(entity);
    return entity;
  }

  public async findById(id: string): Promise<InstituteMembershipEntity | null> {
    return this.memberships.find((m) => m.id === id) || null;
  }

  public async findByUserAndInstitute(
    userId: string,
    instituteId: string,
  ): Promise<InstituteMembershipEntity | null> {
    return (
      this.memberships.find((m) => m.userId === userId && m.instituteId === instituteId) || null
    );
  }

  public async findByUserId(userId: string): Promise<InstituteMembershipEntity[]> {
    return this.memberships.filter((m) => m.userId === userId);
  }

  public async findByInstituteId(instituteId: string): Promise<InstituteMembershipEntity[]> {
    return this.memberships.filter((m) => m.instituteId === instituteId);
  }

  public async updateStatus(
    id: string,
    status: 'active' | 'suspended' | 'removed',
  ): Promise<InstituteMembershipEntity> {
    const m = this.memberships.find((x) => x.id === id);
    if (!m) throw new NotFoundError('Membership not found');
    const updated = InstituteMembershipEntity.from({
      id: m.id,
      userId: m.userId,
      instituteId: m.instituteId,
      role: m.role,
      status,
      createdAt: m.createdAt,
      updatedAt: new Date(),
    });
    return updated;
  }

  public async updateRole(
    id: string,
    role: 'owner' | 'teacher' | 'assistant' | 'parent',
  ): Promise<InstituteMembershipEntity> {
    const m = this.memberships.find((x) => x.id === id);
    if (!m) throw new NotFoundError('Membership not found');
    const updated = InstituteMembershipEntity.from({
      id: m.id,
      userId: m.userId,
      instituteId: m.instituteId,
      role,
      status: m.status,
      createdAt: m.createdAt,
      updatedAt: new Date(),
    });
    return updated;
  }

  public async delete(id: string): Promise<void> {
    const idx = this.memberships.findIndex((m) => m.id === id);
    if (idx !== -1) {
      this.memberships.splice(idx, 1);
    }
  }
}

// ============================================================================
// Phase 1.10.5 — Academic Security & Tenant Isolation E2E Audit Suite
// ============================================================================

describe('Phase 1.10.5 — Academic Hierarchy Security & Tenant Isolation E2E Matrix', () => {
  let programRepo: InMemoryProgramRepo;
  let subjectRepo: InMemorySubjectRepo;
  let programSubjectRepo: InMemoryProgramSubjectRepo;
  let batchRepo: InMemoryBatchRepo;
  let membershipRepo: InMemoryMembershipRepo;

  let instA: string;
  let instB: string;

  let ownerContextA: TenantContext;
  let parentContextA: TenantContext;
  let teacherContextA: TenantContext;
  let ownerContextB: TenantContext;

  let programA: ProgramEntity;
  let subjectA: SubjectEntity;
  let programB: ProgramEntity;
  let subjectB: SubjectEntity;
  let teacherMembershipA: InstituteMembershipEntity;
  let teacherMembershipB: InstituteMembershipEntity;

  beforeEach(async () => {
    programRepo = new InMemoryProgramRepo();
    subjectRepo = new InMemorySubjectRepo();
    programSubjectRepo = new InMemoryProgramSubjectRepo();
    batchRepo = new InMemoryBatchRepo();
    membershipRepo = new InMemoryMembershipRepo();

    instA = `inst_${crypto.randomUUID()}`;
    instB = `inst_${crypto.randomUUID()}`;

    ownerContextA = {
      instituteId: instA,
      userId: `usr_${crypto.randomUUID()}`,
      membershipId: `mem_${crypto.randomUUID()}`,
      role: 'owner',
      status: 'active',
    };

    parentContextA = {
      instituteId: instA,
      userId: `usr_${crypto.randomUUID()}`,
      membershipId: `mem_${crypto.randomUUID()}`,
      role: 'parent',
      status: 'active',
    };

    teacherContextA = {
      instituteId: instA,
      userId: `usr_${crypto.randomUUID()}`,
      membershipId: `mem_${crypto.randomUUID()}`,
      role: 'teacher',
      status: 'active',
    };

    ownerContextB = {
      instituteId: instB,
      userId: `usr_${crypto.randomUUID()}`,
      membershipId: `mem_${crypto.randomUUID()}`,
      role: 'owner',
      status: 'active',
    };

    // Seed Institute A assets
    programA = ProgramEntity.create({ instituteId: instA, name: 'Program Alpha', code: 'PROG-A' });
    subjectA = SubjectEntity.create({ instituteId: instA, name: 'Subject Alpha', code: 'SUB-A' });
    await programRepo.create(programA);
    await subjectRepo.create(subjectA);

    teacherMembershipA = InstituteMembershipEntity.create({
      userId: crypto.randomUUID(),
      instituteId: instA,
      role: 'teacher',
      status: 'active',
    });
    await membershipRepo.create(teacherMembershipA);

    // Seed Institute B assets
    programB = ProgramEntity.create({ instituteId: instB, name: 'Program Beta', code: 'PROG-B' });
    subjectB = SubjectEntity.create({ instituteId: instB, name: 'Subject Beta', code: 'SUB-B' });
    await programRepo.create(programB);
    await subjectRepo.create(subjectB);

    teacherMembershipB = InstituteMembershipEntity.create({
      userId: crypto.randomUUID(),
      instituteId: instB,
      role: 'teacher',
      status: 'active',
    });
    await membershipRepo.create(teacherMembershipB);
  });

  // --------------------------------------------------------------------------
  // ACADEMIC-01: Unauthenticated → 401 / Fail-Closed
  // --------------------------------------------------------------------------
  it('ACADEMIC-01: Unauthenticated or missing tenant context fails fail-closed (401)', async () => {
    const useCase = new CreateProgramUseCase(programRepo);
    const emptyCtx = { instituteId: '', userId: '', membershipId: '', role: 'owner', status: 'active' } as any;

    await expect(
      useCase.execute(emptyCtx, { name: 'Hack Prog', code: 'HACK-01' }),
    ).rejects.toThrow(AuthorizationError);
  });

  // --------------------------------------------------------------------------
  // ACADEMIC-02: Unauthorized Capability → 403 / Forbidden
  // --------------------------------------------------------------------------
  it('ACADEMIC-02: User lacking capability is denied execution (403)', async () => {
    const createProgUseCase = new CreateProgramUseCase(programRepo);
    const createSubjUseCase = new CreateSubjectUseCase(subjectRepo);

    // Parent role lacks PROGRAM_CREATE & SUBJECT_CREATE
    await expect(
      createProgUseCase.execute(parentContextA, { name: 'Parent Prog', code: 'PAR-01' }),
    ).rejects.toThrow(AuthorizationError);

    await expect(
      createSubjUseCase.execute(parentContextA, { name: 'Parent Subj', code: 'PAR-SUB' }),
    ).rejects.toThrow(AuthorizationError);
  });

  // --------------------------------------------------------------------------
  // ACADEMIC-03: Cross-Tenant Program Access → 404 / NotFoundError
  // --------------------------------------------------------------------------
  it('ACADEMIC-03: Cross-tenant Program read/update/archive is blocked (404)', async () => {
    const getProgUseCase = new GetProgramUseCase(programRepo);
    const updateProgUseCase = new UpdateProgramUseCase(programRepo);
    const archiveProgUseCase = new ArchiveProgramUseCase(programRepo);

    // Institute B owner attempting to access Institute A Program
    await expect(
      getProgUseCase.execute(ownerContextB, { id: programA.id }),
    ).rejects.toThrow(NotFoundError);

    await expect(
      updateProgUseCase.execute(ownerContextB, { id: programA.id, name: 'Hacked Name' }),
    ).rejects.toThrow(NotFoundError);

    await expect(
      archiveProgUseCase.execute(ownerContextB, { id: programA.id }),
    ).rejects.toThrow(NotFoundError);
  });

  // --------------------------------------------------------------------------
  // ACADEMIC-04: Cross-Tenant Subject Access → 404 / NotFoundError
  // --------------------------------------------------------------------------
  it('ACADEMIC-04: Cross-tenant Subject read/update/archive is blocked (404)', async () => {
    const getSubjUseCase = new GetSubjectUseCase(subjectRepo);
    const updateSubjUseCase = new UpdateSubjectUseCase(subjectRepo);
    const archiveSubjUseCase = new ArchiveSubjectUseCase(subjectRepo);

    // Institute B owner attempting to access Institute A Subject
    await expect(
      getSubjUseCase.execute(ownerContextB, { id: subjectA.id }),
    ).rejects.toThrow(NotFoundError);

    await expect(
      updateSubjUseCase.execute(ownerContextB, { id: subjectA.id, name: 'Hacked Subject' }),
    ).rejects.toThrow(NotFoundError);

    await expect(
      archiveSubjUseCase.execute(ownerContextB, { id: subjectA.id }),
    ).rejects.toThrow(NotFoundError);
  });

  // --------------------------------------------------------------------------
  // ACADEMIC-05: Cross-Tenant Teacher Assignment → Blocked
  // --------------------------------------------------------------------------
  it('ACADEMIC-05: Assigning teacher from Institute B to Batch in Institute A is blocked', async () => {
    const createBatch = new CreateBatchUseCase(batchRepo, subjectRepo);
    const batchDto = await createBatch.execute(ownerContextA, {
      subjectId: subjectA.id,
      name: 'Inst A Batch',
      code: 'BATCH-A1',
    });

    const assignTeacher = new AssignBatchTeacherUseCase(batchRepo, membershipRepo);

    // Attempting to assign teacherMembershipB (Inst B) to batch in Inst A
    await expect(
      assignTeacher.execute(ownerContextA, {
        id: batchDto.id,
        teacherId: teacherMembershipB.id,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  // --------------------------------------------------------------------------
  // ACADEMIC-06: instituteId Spoofing → Ignored / Isolated
  // --------------------------------------------------------------------------
  it('ACADEMIC-06: Payload attempting to target another institute is safely isolated to context institute', async () => {
    const createProg = new CreateProgramUseCase(programRepo);
    const dto = await createProg.execute(ownerContextA, {
      name: 'Spoof Program',
      code: 'SPOOF-01',
    });

    // Created program MUST belong to Inst A, not any payload override
    expect(dto.instituteId).toBe(instA);

    const foundInB = await programRepo.findById(instB, dto.id);
    expect(foundInB).toBeNull();
  });

  // --------------------------------------------------------------------------
  // ACADEMIC-07: Duplicate Academic Entities → 409 / ConflictError
  // --------------------------------------------------------------------------
  it('ACADEMIC-07: Creating duplicate Program, Subject, or Batch code/name throws 409 ConflictError', async () => {
    const createProg = new CreateProgramUseCase(programRepo);
    const createSubj = new CreateSubjectUseCase(subjectRepo);
    const createBatch = new CreateBatchUseCase(batchRepo, subjectRepo);

    // Duplicate Program code
    await expect(
      createProg.execute(ownerContextA, { name: 'Different Name', code: 'PROG-A' }),
    ).rejects.toThrow(ConflictError);

    // Duplicate Subject name
    await expect(
      createSubj.execute(ownerContextA, { name: 'Subject Alpha', code: 'SUB-NEW' }),
    ).rejects.toThrow(ConflictError);

    // Create initial batch
    await createBatch.execute(ownerContextA, {
      subjectId: subjectA.id,
      name: 'Unique Batch',
      code: 'BATCH-UNIQ',
    });

    // Duplicate Batch code
    await expect(
      createBatch.execute(ownerContextA, {
        subjectId: subjectA.id,
        name: 'Another Batch',
        code: 'BATCH-UNIQ',
      }),
    ).rejects.toThrow(ConflictError);
  });

  // --------------------------------------------------------------------------
  // ACADEMIC-08: Invalid Lifecycle Transition → Rejected
  // --------------------------------------------------------------------------
  it('ACADEMIC-08: Illegal state machine transition on Batch is rejected', async () => {
    const createBatch = new CreateBatchUseCase(batchRepo, subjectRepo);
    const changeStatus = new ChangeBatchStatusUseCase(batchRepo);

    const batch = await createBatch.execute(ownerContextA, {
      subjectId: subjectA.id,
      name: 'Draft Batch',
      code: 'DRAFT-01',
    });

    expect(batch.status).toBe('draft');

    // draft -> running directly is illegal
    await expect(
      changeStatus.execute(ownerContextA, { id: batch.id, status: 'running' }),
    ).rejects.toThrow(ValidationError);
  });

  // --------------------------------------------------------------------------
  // ACADEMIC-09: Cross-Tenant ProgramSubject Mapping → Blocked
  // --------------------------------------------------------------------------
  it('ACADEMIC-09: Mapping Program A (Inst A) with Subject B (Inst B) is blocked', async () => {
    const mapUseCase = new CreateProgramSubjectUseCase(programSubjectRepo, programRepo, subjectRepo);

    // Attempting to map programA (Inst A) to subjectB (Inst B) via Inst A context
    await expect(
      mapUseCase.execute(ownerContextA, {
        programId: programA.id,
        subjectId: subjectB.id,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  // --------------------------------------------------------------------------
  // ACADEMIC-10: Cross-Tenant Batch Dependency → Blocked
  // --------------------------------------------------------------------------
  it('ACADEMIC-10: Creating Batch in Inst A with Subject B (Inst B) or Program B (Inst B) is blocked', async () => {
    const createBatch = new CreateBatchUseCase(batchRepo, subjectRepo, programRepo, programSubjectRepo);

    // Attempt to attach Subject B (Inst B) to Batch in Inst A
    await expect(
      createBatch.execute(ownerContextA, {
        subjectId: subjectB.id,
        name: 'Cross Subj Batch',
        code: 'CROSS-SUBJ',
      }),
    ).rejects.toThrow(NotFoundError);

    // Map subjectA to programA in Inst A
    await programSubjectRepo.create(
      ProgramSubjectEntity.createVerified({
        instituteId: instA,
        programId: programA.id,
        programInstituteId: instA,
        subjectId: subjectA.id,
        subjectInstituteId: instA,
      }),
    );

    // Attempt to attach Program B (Inst B) to Batch in Inst A
    await expect(
      createBatch.execute(ownerContextA, {
        subjectId: subjectA.id,
        programId: programB.id,
        name: 'Cross Prog Batch',
        code: 'CROSS-PROG',
      }),
    ).rejects.toThrow(NotFoundError);
  });

  // --------------------------------------------------------------------------
  // ACADEMIC-11: studentId / enrollmentId Injection → Rejected by Zod
  // --------------------------------------------------------------------------
  it('ACADEMIC-11: Zod presentation schemas reject unexpected studentId or enrollmentId fields', () => {
    const dirtyProgramInput = {
      name: 'Hacked Program',
      code: 'HACK-P',
      studentId: 'std_123',
    };
    expect(() => createProgramSchema.parse(dirtyProgramInput)).toThrow();

    const dirtySubjectInput = {
      name: 'Hacked Subject',
      code: 'HACK-S',
      enrollmentId: 'enr_456',
    };
    expect(() => createSubjectSchema.parse(dirtySubjectInput)).toThrow();

    const dirtyBatchInput = {
      subjectId: 'sub_123',
      name: 'Hacked Batch',
      code: 'HACK-B',
      studentIds: ['std_1', 'std_2'],
    };
    expect(() => createBatchSchema.parse(dirtyBatchInput)).toThrow();

    const dirtyBatchUpdate = {
      name: 'Updated Name',
      enrollmentStatus: 'ACTIVE',
    };
    expect(() => updateBatchSchema.parse(dirtyBatchUpdate)).toThrow();
  });

  // --------------------------------------------------------------------------
  // ACADEMIC-12: Role / Header Spoofing → Ignored
  // --------------------------------------------------------------------------
  it('ACADEMIC-12: Malformed or forged context roles fail-closed', async () => {
    const getBatch = new GetBatchUseCase(batchRepo);
    const batch = await batchRepo.create(
      BatchEntity.create({
        instituteId: instA,
        subjectId: subjectA.id,
        name: 'Alpha Batch',
        code: 'ALPHA-B',
      }),
    );

    const forgedContext = {
      instituteId: instA,
      userId: ownerContextA.userId,
      membershipId: ownerContextA.membershipId,
      role: 'super_hacker' as any,
      status: 'active' as const,
    };

    await expect(getBatch.execute(forgedContext, { id: batch.id })).rejects.toThrow(
      AuthorizationError,
    );
  });

  // --------------------------------------------------------------------------
  // ACADEMIC-13: Unauthorized Teacher / Status Mutation → 403
  // --------------------------------------------------------------------------
  it('ACADEMIC-13: User without BATCH_TEACHER or BATCH_STATUS capability is denied mutation (403)', async () => {
    const assignTeacher = new AssignBatchTeacherUseCase(batchRepo, membershipRepo);
    const changeStatus = new ChangeBatchStatusUseCase(batchRepo);

    const batch = await batchRepo.create(
      BatchEntity.create({
        instituteId: instA,
        subjectId: subjectA.id,
        name: 'Alpha Batch',
        code: 'ALPHA-B',
      }),
    );

    // Parent lacks BATCH_TEACHER and BATCH_STATUS
    await expect(
      assignTeacher.execute(parentContextA, {
        id: batch.id,
        teacherId: teacherMembershipA.id,
      }),
    ).rejects.toThrow(AuthorizationError);

    await expect(
      changeStatus.execute(parentContextA, {
        id: batch.id,
        status: 'open',
      }),
    ).rejects.toThrow(AuthorizationError);
  });

  // --------------------------------------------------------------------------
  // ACADEMIC-14: Batch ProgramSubject Mapping Bypass → Rejected
  // --------------------------------------------------------------------------
  it('ACADEMIC-14: Batch creation/update with unmapped Program-Subject pair is rejected', async () => {
    const createBatch = new CreateBatchUseCase(
      batchRepo,
      subjectRepo,
      programRepo,
      programSubjectRepo,
    );
    const updateBatch = new UpdateBatchUseCase(
      batchRepo,
      programRepo,
      programSubjectRepo,
    );

    // programA and subjectA exist in Inst A, but are NOT mapped in ProgramSubject
    await expect(
      createBatch.execute(ownerContextA, {
        subjectId: subjectA.id,
        programId: programA.id,
        name: 'Unmapped Batch',
        code: 'UNMAPPED-01',
      }),
    ).rejects.toThrow(ValidationError);

    // Create valid batch without program
    const validBatch = await createBatch.execute(ownerContextA, {
      subjectId: subjectA.id,
      name: 'Valid Batch',
      code: 'VALID-01',
    });

    // Attempting to attach unmapped programA during update fails
    await expect(
      updateBatch.execute(ownerContextA, {
        id: validBatch.id,
        programId: programA.id,
      }),
    ).rejects.toThrow(ValidationError);
  });
});
