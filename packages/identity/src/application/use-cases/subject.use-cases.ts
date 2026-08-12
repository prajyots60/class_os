import { logger } from '@coaching-os/observability';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { CAPABILITIES, requireCapability } from '../../authorization';
import type { SubjectStatus } from '../../domain/entities/subject.entity';
import { SubjectEntity } from '../../domain/entities/subject.entity';
import type {
  ListSubjectsOptions,
  SubjectRepository,
} from '../../domain/repositories/subject.repository';
import type { TenantContext } from './membership.use-cases';
import { toSubjectDTO, type SubjectDTO } from '../dto/subject.dto';

// ============================================================================
// 1. CreateSubjectUseCase
// ============================================================================

export interface CreateSubjectCommand {
  name: string;
  code: string;
  description?: string | null;
}

export class CreateSubjectUseCase {
  constructor(private readonly subjectRepository: SubjectRepository) {}

  public async execute(
    context: TenantContext,
    command: CreateSubjectCommand,
  ): Promise<SubjectDTO> {
    requireCapability(context, CAPABILITIES.SUBJECT_CREATE);

    const existsCode = await this.subjectRepository.existsByCode(
      context.instituteId,
      command.code,
    );
    if (existsCode) {
      throw new ConflictError(
        `A subject with code "${command.code}" already exists in institute "${context.instituteId}".`,
      );
    }

    const existsName = await this.subjectRepository.existsByName(
      context.instituteId,
      command.name,
    );
    if (existsName) {
      throw new ConflictError(
        `A subject with name "${command.name}" already exists in institute "${context.instituteId}".`,
      );
    }

    const entity = SubjectEntity.create({
      instituteId: context.instituteId,
      name: command.name,
      code: command.code,
      description: command.description,
      status: 'draft',
    });

    let saved: SubjectEntity;
    try {
      saved = await this.subjectRepository.create(entity);
    } catch (err) {
      if (err instanceof ConflictError) {
        throw new ConflictError(
          `A subject with code or name already exists in institute "${context.instituteId}".`,
        );
      }
      throw err;
    }

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        subjectId: saved.id,
        code: saved.code.value,
        operation: 'identity.subject.create.success',
      },
      'identity.subject.create.success',
    );

    return toSubjectDTO(saved);
  }
}

// ============================================================================
// 2. GetSubjectUseCase
// ============================================================================

export interface GetSubjectQuery {
  id: string;
}

export class GetSubjectUseCase {
  constructor(private readonly subjectRepository: SubjectRepository) {}

  public async execute(context: TenantContext, query: GetSubjectQuery): Promise<SubjectDTO> {
    requireCapability(context, CAPABILITIES.SUBJECT_READ);

    const entity = await this.subjectRepository.findById(context.instituteId, query.id);

    if (!entity) {
      throw new NotFoundError(`Subject record with ID "${query.id}" not found.`);
    }

    return toSubjectDTO(entity);
  }
}

// ============================================================================
// 3. ListSubjectsUseCase
// ============================================================================

export interface ListSubjectsQuery extends ListSubjectsOptions {}

export class ListSubjectsUseCase {
  constructor(private readonly subjectRepository: SubjectRepository) {}

  public async execute(
    context: TenantContext,
    query?: ListSubjectsQuery,
  ): Promise<SubjectDTO[]> {
    requireCapability(context, CAPABILITIES.SUBJECT_READ);

    const entities = await this.subjectRepository.listByInstitute(context.instituteId, query);

    return entities.map((entity) => toSubjectDTO(entity));
  }
}

// ============================================================================
// 4. UpdateSubjectUseCase
// ============================================================================

export interface UpdateSubjectCommand {
  id: string;
  name?: string;
  description?: string | null;
}

export class UpdateSubjectUseCase {
  constructor(private readonly subjectRepository: SubjectRepository) {}

  public async execute(
    context: TenantContext,
    command: UpdateSubjectCommand,
  ): Promise<SubjectDTO> {
    requireCapability(context, CAPABILITIES.SUBJECT_UPDATE);

    const entity = await this.subjectRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Subject record with ID "${command.id}" not found.`);
    }

    if (command.name !== undefined && command.name.trim().toLowerCase() !== entity.name.toLowerCase()) {
      const existsName = await this.subjectRepository.existsByName(
        context.instituteId,
        command.name,
      );
      if (existsName) {
        throw new ConflictError(
          `A subject with name "${command.name}" already exists in institute "${context.instituteId}".`,
        );
      }
    }

    entity.updateProfile({
      name: command.name,
      description: command.description,
    });

    const updated = await this.subjectRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        subjectId: updated.id,
        operation: 'identity.subject.update.success',
      },
      'identity.subject.update.success',
    );

    return toSubjectDTO(updated);
  }
}

// ============================================================================
// 5. ActivateSubjectUseCase
// ============================================================================

export interface ActivateSubjectCommand {
  id: string;
}

export class ActivateSubjectUseCase {
  constructor(private readonly subjectRepository: SubjectRepository) {}

  public async execute(
    context: TenantContext,
    command: ActivateSubjectCommand,
  ): Promise<SubjectDTO> {
    requireCapability(context, CAPABILITIES.SUBJECT_UPDATE);

    const entity = await this.subjectRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Subject record with ID "${command.id}" not found.`);
    }

    entity.activate();

    const updated = await this.subjectRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        subjectId: updated.id,
        status: updated.status,
        operation: 'identity.subject.update.activated',
      },
      'identity.subject.update.activated',
    );

    return toSubjectDTO(updated);
  }
}

// ============================================================================
// 6. ArchiveSubjectUseCase
// ============================================================================

export interface ArchiveSubjectCommand {
  id: string;
}

export class ArchiveSubjectUseCase {
  constructor(private readonly subjectRepository: SubjectRepository) {}

  public async execute(
    context: TenantContext,
    command: ArchiveSubjectCommand,
  ): Promise<SubjectDTO> {
    requireCapability(context, CAPABILITIES.SUBJECT_ARCHIVE);

    const entity = await this.subjectRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Subject record with ID "${command.id}" not found.`);
    }

    entity.archive();

    const updated = await this.subjectRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        subjectId: updated.id,
        status: updated.status,
        operation: 'identity.subject.archive.success',
      },
      'identity.subject.archive.success',
    );

    return toSubjectDTO(updated);
  }
}
