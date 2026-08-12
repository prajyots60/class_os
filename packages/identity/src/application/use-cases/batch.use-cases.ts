import { logger } from '@coaching-os/observability';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { CAPABILITIES, requireCapability } from '../../authorization';
import type { BatchStatus } from '../../domain/entities/batch.entity';
import { BatchEntity } from '../../domain/entities/batch.entity';
import type {
  BatchRepository,
  ListBatchesOptions,
} from '../../domain/repositories/batch.repository';
import type { InstituteMembershipRepository } from '../../domain/repositories/institute-membership.repository';
import type { ProgramRepository } from '../../domain/repositories/program.repository';
import type { ProgramSubjectRepository } from '../../domain/repositories/program-subject.repository';
import type { SubjectRepository } from '../../domain/repositories/subject.repository';
import type { TenantContext } from './membership.use-cases';
import { toBatchDTO, type BatchDTO } from '../dto/batch.dto';

// ============================================================================
// 1. CreateBatchUseCase
// ============================================================================

export interface CreateBatchCommand {
  subjectId: string;
  programId?: string | null;
  teacherId?: string | null;
  name: string;
  code: string;
  capacity?: number | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}

export class CreateBatchUseCase {
  constructor(
    private readonly batchRepository: BatchRepository,
    private readonly subjectRepository: SubjectRepository,
    private readonly programRepository?: ProgramRepository,
    private readonly programSubjectRepository?: ProgramSubjectRepository,
    private readonly membershipRepository?: InstituteMembershipRepository,
  ) {}

  public async execute(
    context: TenantContext,
    command: CreateBatchCommand,
  ): Promise<BatchDTO> {
    requireCapability(context, CAPABILITIES.BATCH_CREATE);

    const existsCode = await this.batchRepository.existsByCode(
      context.instituteId,
      command.code,
    );
    if (existsCode) {
      throw new ConflictError(
        `A batch with code "${command.code}" already exists in institute "${context.instituteId}".`,
      );
    }

    const existsNameSubject = await this.batchRepository.existsByNameAndSubject(
      context.instituteId,
      command.subjectId,
      command.name,
    );
    if (existsNameSubject) {
      throw new ConflictError(
        `A batch with name "${command.name}" already exists for subject "${command.subjectId}" in institute "${context.instituteId}".`,
      );
    }

    const subject = await this.subjectRepository.findById(context.instituteId, command.subjectId);
    if (!subject || subject.instituteId !== context.instituteId) {
      throw new NotFoundError(`Subject with ID "${command.subjectId}" not found.`);
    }

    if (command.programId) {
      if (this.programRepository) {
        const program = await this.programRepository.findById(context.instituteId, command.programId);
        if (!program || program.instituteId !== context.instituteId) {
          throw new NotFoundError(`Program with ID "${command.programId}" not found.`);
        }
      }

      if (this.programSubjectRepository) {
        const isMapped = await this.programSubjectRepository.existsByPair(
          context.instituteId,
          command.programId,
          command.subjectId,
        );
        if (!isMapped) {
          throw new ValidationError(
            `Subject "${command.subjectId}" is not associated with Program "${command.programId}" in ProgramSubject mapping (ACADEMIC-14).`,
          );
        }
      }
    }

    if (command.teacherId && this.membershipRepository) {
      const teacher = await this.membershipRepository.findById(command.teacherId);
      if (!teacher || teacher.instituteId !== context.instituteId) {
        throw new NotFoundError(`Teacher membership with ID "${command.teacherId}" not found in tenant.`);
      }
      if (teacher.status !== 'active') {
        throw new ValidationError(`Teacher membership "${command.teacherId}" is not active.`);
      }
      if (!['owner', 'teacher', 'assistant'].includes(teacher.role)) {
        throw new ValidationError(`Membership role "${teacher.role}" is not permitted to teach batches.`);
      }
    }

    const entity = BatchEntity.create({
      instituteId: context.instituteId,
      subjectId: command.subjectId,
      programId: command.programId,
      teacherId: command.teacherId,
      name: command.name,
      code: command.code,
      capacity: command.capacity,
      status: 'draft',
      startDate: command.startDate,
      endDate: command.endDate,
    });

    let saved: BatchEntity;
    try {
      saved = await this.batchRepository.create(entity);
    } catch (err) {
      if (err instanceof ConflictError) {
        throw new ConflictError(
          `A batch with code or name already exists in institute "${context.instituteId}".`,
        );
      }
      throw err;
    }

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        batchId: saved.id,
        code: saved.code.value,
        subjectId: saved.subjectId,
        programId: saved.programId,
        teacherId: saved.teacherId,
        operation: 'identity.batch.create.success',
      },
      'identity.batch.create.success',
    );

    return toBatchDTO(saved);
  }
}

// ============================================================================
// 2. GetBatchUseCase
// ============================================================================

export interface GetBatchQuery {
  id: string;
}

export class GetBatchUseCase {
  constructor(private readonly batchRepository: BatchRepository) {}

  public async execute(context: TenantContext, query: GetBatchQuery): Promise<BatchDTO> {
    requireCapability(context, CAPABILITIES.BATCH_READ);

    const entity = await this.batchRepository.findById(context.instituteId, query.id);

    if (!entity) {
      throw new NotFoundError(`Batch record with ID "${query.id}" not found.`);
    }

    return toBatchDTO(entity);
  }
}

// ============================================================================
// 3. ListBatchesUseCase
// ============================================================================

export interface ListBatchesQuery extends ListBatchesOptions {}

export class ListBatchesUseCase {
  constructor(private readonly batchRepository: BatchRepository) {}

  public async execute(
    context: TenantContext,
    query?: ListBatchesQuery,
  ): Promise<BatchDTO[]> {
    requireCapability(context, CAPABILITIES.BATCH_READ);

    const entities = await this.batchRepository.listByInstitute(context.instituteId, query);

    return entities.map((entity) => toBatchDTO(entity));
  }
}

// ============================================================================
// 4. UpdateBatchUseCase
// ============================================================================

export interface UpdateBatchCommand {
  id: string;
  name?: string;
  programId?: string | null;
  capacity?: number | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}

export class UpdateBatchUseCase {
  constructor(
    private readonly batchRepository: BatchRepository,
    private readonly programRepository?: ProgramRepository,
    private readonly programSubjectRepository?: ProgramSubjectRepository,
  ) {}

  public async execute(
    context: TenantContext,
    command: UpdateBatchCommand,
  ): Promise<BatchDTO> {
    requireCapability(context, CAPABILITIES.BATCH_UPDATE);

    const entity = await this.batchRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Batch record with ID "${command.id}" not found.`);
    }

    if (command.name !== undefined && command.name.trim().toLowerCase() !== entity.name.toLowerCase()) {
      const existsName = await this.batchRepository.existsByNameAndSubject(
        context.instituteId,
        entity.subjectId,
        command.name,
      );
      if (existsName) {
        throw new ConflictError(
          `A batch with name "${command.name}" already exists for subject "${entity.subjectId}".`,
        );
      }
    }

    if (command.programId) {
      if (this.programRepository) {
        const program = await this.programRepository.findById(context.instituteId, command.programId);
        if (!program || program.instituteId !== context.instituteId) {
          throw new NotFoundError(`Program with ID "${command.programId}" not found.`);
        }
      }

      if (this.programSubjectRepository) {
        const isMapped = await this.programSubjectRepository.existsByPair(
          context.instituteId,
          command.programId,
          entity.subjectId,
        );
        if (!isMapped) {
          throw new ValidationError(
            `Subject "${entity.subjectId}" is not associated with Program "${command.programId}" in ProgramSubject mapping (ACADEMIC-14).`,
          );
        }
      }
    }

    entity.updateProfile({
      name: command.name,
      programId: command.programId,
      capacity: command.capacity,
      startDate: command.startDate,
      endDate: command.endDate,
    });

    const updated = await this.batchRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        batchId: updated.id,
        operation: 'identity.batch.update.success',
      },
      'identity.batch.update.success',
    );

    return toBatchDTO(updated);
  }
}

// ============================================================================
// 5. AssignBatchTeacherUseCase
// ============================================================================

export interface AssignBatchTeacherCommand {
  id: string;
  teacherId: string | null;
}

export class AssignBatchTeacherUseCase {
  constructor(
    private readonly batchRepository: BatchRepository,
    private readonly membershipRepository: InstituteMembershipRepository,
  ) {}

  public async execute(
    context: TenantContext,
    command: AssignBatchTeacherCommand,
  ): Promise<BatchDTO> {
    requireCapability(context, CAPABILITIES.BATCH_TEACHER);

    const entity = await this.batchRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Batch record with ID "${command.id}" not found.`);
    }

    if (command.teacherId) {
      const teacher = await this.membershipRepository.findById(command.teacherId);
      if (!teacher || teacher.instituteId !== context.instituteId) {
        throw new NotFoundError(`Teacher membership with ID "${command.teacherId}" not found in tenant.`);
      }
      if (teacher.status !== 'active') {
        throw new ValidationError(`Teacher membership "${command.teacherId}" is not active.`);
      }
      if (!['owner', 'teacher', 'assistant'].includes(teacher.role)) {
        throw new ValidationError(`Membership role "${teacher.role}" is not permitted to teach batches.`);
      }
    }

    entity.assignTeacher(command.teacherId);

    const updated = await this.batchRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        batchId: updated.id,
        teacherId: updated.teacherId,
        operation: 'identity.batch.teacher_assigned',
      },
      'identity.batch.teacher_assigned',
    );

    return toBatchDTO(updated);
  }
}

// ============================================================================
// 6. ChangeBatchStatusUseCase
// ============================================================================

export interface ChangeBatchStatusCommand {
  id: string;
  status: BatchStatus;
}

export class ChangeBatchStatusUseCase {
  constructor(private readonly batchRepository: BatchRepository) {}

  public async execute(
    context: TenantContext,
    command: ChangeBatchStatusCommand,
  ): Promise<BatchDTO> {
    requireCapability(context, CAPABILITIES.BATCH_STATUS);

    const entity = await this.batchRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Batch record with ID "${command.id}" not found.`);
    }

    switch (command.status) {
      case 'open':
        entity.open();
        break;
      case 'running':
        entity.start();
        break;
      case 'completed':
        entity.complete();
        break;
      case 'archived':
        entity.archive();
        break;
      case 'draft':
        if (entity.status !== 'draft') {
          throw new ValidationError(`Cannot transition batch back to "draft" status from "${entity.status}".`);
        }
        break;
      default:
        throw new ValidationError(`Invalid batch status: "${command.status}".`);
    }

    const updated = await this.batchRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        batchId: updated.id,
        status: updated.status,
        operation: 'identity.batch.status_changed',
      },
      'identity.batch.status_changed',
    );

    return toBatchDTO(updated);
  }
}

// ============================================================================
// 7. ArchiveBatchUseCase
// ============================================================================

export interface ArchiveBatchCommand {
  id: string;
}

export class ArchiveBatchUseCase {
  constructor(private readonly batchRepository: BatchRepository) {}

  public async execute(
    context: TenantContext,
    command: ArchiveBatchCommand,
  ): Promise<BatchDTO> {
    requireCapability(context, CAPABILITIES.BATCH_ARCHIVE);

    const entity = await this.batchRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Batch record with ID "${command.id}" not found.`);
    }

    entity.archive();

    const updated = await this.batchRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        batchId: updated.id,
        status: updated.status,
        operation: 'identity.batch.archive.success',
      },
      'identity.batch.archive.success',
    );

    return toBatchDTO(updated);
  }
}
