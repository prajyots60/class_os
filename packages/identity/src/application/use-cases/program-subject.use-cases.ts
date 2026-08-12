import { logger } from '@coaching-os/observability';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { CAPABILITIES, requireCapability } from '../../authorization';
import { ProgramSubjectEntity } from '../../domain/entities/program-subject.entity';
import type { ProgramRepository } from '../../domain/repositories/program.repository';
import type { ProgramSubjectRepository } from '../../domain/repositories/program-subject.repository';
import type { SubjectRepository } from '../../domain/repositories/subject.repository';
import type { TenantContext } from './membership.use-cases';
import { toProgramSubjectDTO, type ProgramSubjectDTO } from '../dto/program-subject.dto';

// ============================================================================
// 1. CreateProgramSubjectUseCase
// ============================================================================

export interface CreateProgramSubjectCommand {
  programId: string;
  subjectId: string;
}

export class CreateProgramSubjectUseCase {
  constructor(
    private readonly programSubjectRepository: ProgramSubjectRepository,
    private readonly programRepository: ProgramRepository,
    private readonly subjectRepository: SubjectRepository,
  ) {}

  public async execute(
    context: TenantContext,
    command: CreateProgramSubjectCommand,
  ): Promise<ProgramSubjectDTO> {
    requireCapability(context, CAPABILITIES.PROGRAM_UPDATE);

    const program = await this.programRepository.findById(context.instituteId, command.programId);
    if (!program || program.instituteId !== context.instituteId) {
      throw new NotFoundError(`Program with ID "${command.programId}" not found.`);
    }

    const subject = await this.subjectRepository.findById(context.instituteId, command.subjectId);
    if (!subject || subject.instituteId !== context.instituteId) {
      throw new NotFoundError(`Subject with ID "${command.subjectId}" not found.`);
    }

    const exists = await this.programSubjectRepository.existsByPair(
      context.instituteId,
      command.programId,
      command.subjectId,
    );

    if (exists) {
      throw new ConflictError(
        `Subject "${command.subjectId}" is already mapped to Program "${command.programId}" in institute "${context.instituteId}".`,
      );
    }

    const entity = ProgramSubjectEntity.createVerified({
      instituteId: context.instituteId,
      programId: command.programId,
      programInstituteId: program.instituteId,
      subjectId: command.subjectId,
      subjectInstituteId: subject.instituteId,
    });

    let saved: ProgramSubjectEntity;
    try {
      saved = await this.programSubjectRepository.create(entity);
    } catch (err) {
      if (err instanceof ConflictError) {
        throw new ConflictError(
          `Subject "${command.subjectId}" is already mapped to Program "${command.programId}".`,
        );
      }
      throw err;
    }

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        programSubjectId: saved.id,
        programId: saved.programId,
        subjectId: saved.subjectId,
        operation: 'identity.program_subject.map.success',
      },
      'identity.program_subject.map.success',
    );

    return toProgramSubjectDTO(saved);
  }
}

// ============================================================================
// 2. GetProgramSubjectUseCase
// ============================================================================

export interface GetProgramSubjectQuery {
  id: string;
}

export class GetProgramSubjectUseCase {
  constructor(private readonly programSubjectRepository: ProgramSubjectRepository) {}

  public async execute(
    context: TenantContext,
    query: GetProgramSubjectQuery,
  ): Promise<ProgramSubjectDTO> {
    requireCapability(context, CAPABILITIES.PROGRAM_READ);

    const entity = await this.programSubjectRepository.findById(context.instituteId, query.id);

    if (!entity) {
      throw new NotFoundError(`ProgramSubject record with ID "${query.id}" not found.`);
    }

    return toProgramSubjectDTO(entity);
  }
}

// ============================================================================
// 3. ListProgramSubjectsByProgramUseCase
// ============================================================================

export interface ListProgramSubjectsByProgramQuery {
  programId: string;
}

export class ListProgramSubjectsByProgramUseCase {
  constructor(
    private readonly programSubjectRepository: ProgramSubjectRepository,
    private readonly programRepository: ProgramRepository,
  ) {}

  public async execute(
    context: TenantContext,
    query: ListProgramSubjectsByProgramQuery,
  ): Promise<ProgramSubjectDTO[]> {
    requireCapability(context, CAPABILITIES.PROGRAM_READ);

    const program = await this.programRepository.findById(context.instituteId, query.programId);
    if (!program || program.instituteId !== context.instituteId) {
      throw new NotFoundError(`Program with ID "${query.programId}" not found.`);
    }

    const entities = await this.programSubjectRepository.listByProgramId(
      context.instituteId,
      query.programId,
    );

    return entities.map((entity) => toProgramSubjectDTO(entity));
  }
}

// ============================================================================
// 4. ListProgramSubjectsBySubjectUseCase
// ============================================================================

export interface ListProgramSubjectsBySubjectQuery {
  subjectId: string;
}

export class ListProgramSubjectsBySubjectUseCase {
  constructor(
    private readonly programSubjectRepository: ProgramSubjectRepository,
    private readonly subjectRepository: SubjectRepository,
  ) {}

  public async execute(
    context: TenantContext,
    query: ListProgramSubjectsBySubjectQuery,
  ): Promise<ProgramSubjectDTO[]> {
    requireCapability(context, CAPABILITIES.SUBJECT_READ);

    const subject = await this.subjectRepository.findById(context.instituteId, query.subjectId);
    if (!subject || subject.instituteId !== context.instituteId) {
      throw new NotFoundError(`Subject with ID "${query.subjectId}" not found.`);
    }

    const entities = await this.programSubjectRepository.listBySubjectId(
      context.instituteId,
      query.subjectId,
    );

    return entities.map((entity) => toProgramSubjectDTO(entity));
  }
}

// ============================================================================
// 5. UnmapProgramSubjectUseCase / DeleteProgramSubjectUseCase
// ============================================================================

export interface DeleteProgramSubjectCommand {
  programId: string;
  subjectId: string;
}

export class DeleteProgramSubjectUseCase {
  constructor(private readonly programSubjectRepository: ProgramSubjectRepository) {}

  public async execute(
    context: TenantContext,
    command: DeleteProgramSubjectCommand,
  ): Promise<void> {
    requireCapability(context, CAPABILITIES.PROGRAM_UPDATE);

    const deleted = await this.programSubjectRepository.deleteByPair(
      context.instituteId,
      command.programId,
      command.subjectId,
    );

    if (!deleted) {
      throw new NotFoundError(
        `ProgramSubject mapping for Program "${command.programId}" and Subject "${command.subjectId}" not found.`,
      );
    }

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        programId: command.programId,
        subjectId: command.subjectId,
        operation: 'identity.program_subject.unmap.success',
      },
      'identity.program_subject.unmap.success',
    );
  }
}
