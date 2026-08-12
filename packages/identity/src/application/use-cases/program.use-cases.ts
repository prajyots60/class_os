import { logger } from '@coaching-os/observability';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { CAPABILITIES, requireCapability } from '../../authorization';
import type { ProgramStatus } from '../../domain/entities/program.entity';
import { ProgramEntity } from '../../domain/entities/program.entity';
import type {
  ListProgramsOptions,
  ProgramRepository,
} from '../../domain/repositories/program.repository';
import type { TenantContext } from './membership.use-cases';
import { toProgramDTO, type ProgramDTO } from '../dto/program.dto';

// ============================================================================
// 1. CreateProgramUseCase
// ============================================================================

export interface CreateProgramCommand {
  name: string;
  code: string;
  description?: string | null;
}

export class CreateProgramUseCase {
  constructor(private readonly programRepository: ProgramRepository) {}

  public async execute(
    context: TenantContext,
    command: CreateProgramCommand,
  ): Promise<ProgramDTO> {
    requireCapability(context, CAPABILITIES.PROGRAM_CREATE);

    const existsCode = await this.programRepository.existsByCode(
      context.instituteId,
      command.code,
    );
    if (existsCode) {
      throw new ConflictError(
        `A program with code "${command.code}" already exists in institute "${context.instituteId}".`,
      );
    }

    const existsName = await this.programRepository.existsByName(
      context.instituteId,
      command.name,
    );
    if (existsName) {
      throw new ConflictError(
        `A program with name "${command.name}" already exists in institute "${context.instituteId}".`,
      );
    }

    const entity = ProgramEntity.create({
      instituteId: context.instituteId,
      name: command.name,
      code: command.code,
      description: command.description,
      status: 'draft',
    });

    let saved: ProgramEntity;
    try {
      saved = await this.programRepository.create(entity);
    } catch (err) {
      if (err instanceof ConflictError) {
        throw new ConflictError(
          `A program with code or name already exists in institute "${context.instituteId}".`,
        );
      }
      throw err;
    }

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        programId: saved.id,
        code: saved.code.value,
        operation: 'identity.program.create.success',
      },
      'identity.program.create.success',
    );

    return toProgramDTO(saved);
  }
}

// ============================================================================
// 2. GetProgramUseCase
// ============================================================================

export interface GetProgramQuery {
  id: string;
}

export class GetProgramUseCase {
  constructor(private readonly programRepository: ProgramRepository) {}

  public async execute(context: TenantContext, query: GetProgramQuery): Promise<ProgramDTO> {
    requireCapability(context, CAPABILITIES.PROGRAM_READ);

    const entity = await this.programRepository.findById(context.instituteId, query.id);

    if (!entity) {
      throw new NotFoundError(`Program record with ID "${query.id}" not found.`);
    }

    return toProgramDTO(entity);
  }
}

// ============================================================================
// 3. ListProgramsUseCase
// ============================================================================

export interface ListProgramsQuery extends ListProgramsOptions {}

export class ListProgramsUseCase {
  constructor(private readonly programRepository: ProgramRepository) {}

  public async execute(
    context: TenantContext,
    query?: ListProgramsQuery,
  ): Promise<ProgramDTO[]> {
    requireCapability(context, CAPABILITIES.PROGRAM_READ);

    const entities = await this.programRepository.listByInstitute(context.instituteId, query);

    return entities.map((entity) => toProgramDTO(entity));
  }
}

// ============================================================================
// 4. UpdateProgramUseCase
// ============================================================================

export interface UpdateProgramCommand {
  id: string;
  name?: string;
  description?: string | null;
}

export class UpdateProgramUseCase {
  constructor(private readonly programRepository: ProgramRepository) {}

  public async execute(
    context: TenantContext,
    command: UpdateProgramCommand,
  ): Promise<ProgramDTO> {
    requireCapability(context, CAPABILITIES.PROGRAM_UPDATE);

    const entity = await this.programRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Program record with ID "${command.id}" not found.`);
    }

    if (command.name !== undefined && command.name.trim().toLowerCase() !== entity.name.toLowerCase()) {
      const existsName = await this.programRepository.existsByName(
        context.instituteId,
        command.name,
      );
      if (existsName) {
        throw new ConflictError(
          `A program with name "${command.name}" already exists in institute "${context.instituteId}".`,
        );
      }
    }

    entity.updateProfile({
      name: command.name,
      description: command.description,
    });

    const updated = await this.programRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        programId: updated.id,
        operation: 'identity.program.update.success',
      },
      'identity.program.update.success',
    );

    return toProgramDTO(updated);
  }
}

// ============================================================================
// 5. ActivateProgramUseCase
// ============================================================================

export interface ActivateProgramCommand {
  id: string;
}

export class ActivateProgramUseCase {
  constructor(private readonly programRepository: ProgramRepository) {}

  public async execute(
    context: TenantContext,
    command: ActivateProgramCommand,
  ): Promise<ProgramDTO> {
    requireCapability(context, CAPABILITIES.PROGRAM_UPDATE);

    const entity = await this.programRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Program record with ID "${command.id}" not found.`);
    }

    entity.activate();

    const updated = await this.programRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        programId: updated.id,
        status: updated.status,
        operation: 'identity.program.update.activated',
      },
      'identity.program.update.activated',
    );

    return toProgramDTO(updated);
  }
}

// ============================================================================
// 6. ArchiveProgramUseCase
// ============================================================================

export interface ArchiveProgramCommand {
  id: string;
}

export class ArchiveProgramUseCase {
  constructor(private readonly programRepository: ProgramRepository) {}

  public async execute(
    context: TenantContext,
    command: ArchiveProgramCommand,
  ): Promise<ProgramDTO> {
    requireCapability(context, CAPABILITIES.PROGRAM_ARCHIVE);

    const entity = await this.programRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Program record with ID "${command.id}" not found.`);
    }

    entity.archive();

    const updated = await this.programRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        programId: updated.id,
        status: updated.status,
        operation: 'identity.program.archive.success',
      },
      'identity.program.archive.success',
    );

    return toProgramDTO(updated);
  }
}
