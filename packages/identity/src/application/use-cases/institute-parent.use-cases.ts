import { logger } from '@coaching-os/observability';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';
import { ParentIdentityEntity } from '../../domain/entities/parent-identity.entity';
import type { InstituteParentStatus } from '../../domain/entities/institute-parent.entity';
import { InstituteParentEntity } from '../../domain/entities/institute-parent.entity';
import type { ParentIdentityRepository } from '../../domain/repositories/parent-identity.repository';
import type { InstituteParentRepository } from '../../domain/repositories/institute-parent.repository';
import { CAPABILITIES, requireCapability } from '../../authorization';
import type { TenantContext } from './membership.use-cases';
import {
  toInstituteParentDTO,
  type InstituteParentDTO,
} from '../dto/institute-parent.dto';

// ============================================================================
// 1. CreateInstituteParentUseCase
// ============================================================================

export interface CreateInstituteParentCommand {
  phone: string;
  name?: string | null;
  notes?: string | null;
  initialStatus?: InstituteParentStatus;
}

export class CreateInstituteParentUseCase {
  constructor(
    private readonly instituteParentRepository: InstituteParentRepository,
    private readonly parentIdentityRepository: ParentIdentityRepository,
  ) {}

  public async execute(
    context: TenantContext,
    command: CreateInstituteParentCommand,
  ): Promise<InstituteParentDTO> {
    // 1. Authorization check before any read/write operations
    requireCapability(context, CAPABILITIES.PARENT_CREATE);

    // 2. Normalize and validate canonical E.164 phone number
    const phoneVO = PhoneNumber.create(command.phone);

    // 3. Resolve global ParentIdentity by canonical phone (Phase 1.7.4 linking)
    let parentIdentity = await this.parentIdentityRepository.findByPhone(phoneVO);

    if (!parentIdentity) {
      const newParentEntity = ParentIdentityEntity.create({
        phone: phoneVO,
        name: command.name ?? null,
      });

      try {
        parentIdentity = await this.parentIdentityRepository.create(newParentEntity);
      } catch (err) {
        if (err instanceof ConflictError) {
          // Handle concurrent creation safety by fetching identity created by competing request
          parentIdentity = await this.parentIdentityRepository.findByPhone(phoneVO);
        }
        if (!parentIdentity) {
          throw err;
        }
      }
    }

    // 4. Duplicate check within the target institute context
    const existingLink = await this.instituteParentRepository.findByParentIdentityId(
      context.instituteId,
      parentIdentity.id,
    );

    if (existingLink) {
      throw new ConflictError(
        `Parent identity ${parentIdentity.id} is already linked to institute ${context.instituteId}.`,
      );
    }

    // 5. Instantiate tenant-scoped CRM aggregate
    const entity = InstituteParentEntity.create({
      instituteId: context.instituteId,
      parentIdentityId: parentIdentity.id,
      notes: command.notes ?? null,
      status: command.initialStatus ?? 'active',
    });

    let saved: InstituteParentEntity;
    try {
      saved = await this.instituteParentRepository.create(entity);
    } catch (err) {
      if (err instanceof ConflictError) {
        throw new ConflictError(
          `Parent identity ${parentIdentity.id} is already linked to institute ${context.instituteId}.`,
        );
      }
      throw err;
    }

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        parentIdentityId: parentIdentity.id,
        instituteParentId: saved.id,
        operation: 'parent_crm.created',
      },
      'parent_crm.created',
    );

    return toInstituteParentDTO(saved, parentIdentity);
  }
}

// ============================================================================
// 2. GetInstituteParentUseCase
// ============================================================================

export interface GetInstituteParentQuery {
  id: string;
}

export class GetInstituteParentUseCase {
  constructor(
    private readonly instituteParentRepository: InstituteParentRepository,
    private readonly parentIdentityRepository: ParentIdentityRepository,
  ) {}

  public async execute(
    context: TenantContext,
    query: GetInstituteParentQuery,
  ): Promise<InstituteParentDTO> {
    requireCapability(context, CAPABILITIES.PARENT_READ);

    const entity = await this.instituteParentRepository.findById(
      context.instituteId,
      query.id,
    );

    if (!entity) {
      throw new NotFoundError(`Institute parent record with ID ${query.id} not found.`);
    }

    const parentIdentity = await this.parentIdentityRepository.findById(
      entity.parentIdentityId,
    );

    return toInstituteParentDTO(entity, parentIdentity || undefined);
  }
}

// ============================================================================
// 3. ListInstituteParentsUseCase
// ============================================================================

export interface ListInstituteParentsQuery {
  status?: InstituteParentStatus;
  page?: number;
  limit?: number;
}

export class ListInstituteParentsUseCase {
  constructor(
    private readonly instituteParentRepository: InstituteParentRepository,
    private readonly parentIdentityRepository: ParentIdentityRepository,
  ) {}

  public async execute(
    context: TenantContext,
    query?: ListInstituteParentsQuery,
  ): Promise<InstituteParentDTO[]> {
    requireCapability(context, CAPABILITIES.PARENT_READ);

    const entities = await this.instituteParentRepository.listByInstitute(
      context.instituteId,
      query,
    );

    const dtos = await Promise.all(
      entities.map(async (entity) => {
        const parentIdentity = await this.parentIdentityRepository.findById(
          entity.parentIdentityId,
        );
        return toInstituteParentDTO(entity, parentIdentity || undefined);
      }),
    );

    return dtos;
  }
}

// ============================================================================
// 4. UpdateInstituteParentUseCase
// ============================================================================

export interface UpdateInstituteParentCommand {
  id: string;
  notes?: string | null;
  status?: InstituteParentStatus;
}

export class UpdateInstituteParentUseCase {
  constructor(
    private readonly instituteParentRepository: InstituteParentRepository,
    private readonly parentIdentityRepository: ParentIdentityRepository,
  ) {}

  public async execute(
    context: TenantContext,
    command: UpdateInstituteParentCommand,
  ): Promise<InstituteParentDTO> {
    requireCapability(context, CAPABILITIES.PARENT_UPDATE);

    const entity = await this.instituteParentRepository.findById(
      context.instituteId,
      command.id,
    );

    if (!entity) {
      throw new NotFoundError(`Institute parent record with ID ${command.id} not found.`);
    }

    if (command.notes !== undefined) {
      entity.updateNotes(command.notes);
    }

    if (command.status !== undefined) {
      entity.changeStatus(command.status);
    }

    const updated = await this.instituteParentRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        instituteParentId: updated.id,
        operation: 'parent_crm.updated',
      },
      'parent_crm.updated',
    );

    const parentIdentity = await this.parentIdentityRepository.findById(
      updated.parentIdentityId,
    );

    return toInstituteParentDTO(updated, parentIdentity || undefined);
  }
}

// ============================================================================
// 5. ArchiveInstituteParentUseCase
// ============================================================================

export interface ArchiveInstituteParentCommand {
  id: string;
}

export class ArchiveInstituteParentUseCase {
  constructor(
    private readonly instituteParentRepository: InstituteParentRepository,
    private readonly parentIdentityRepository: ParentIdentityRepository,
  ) {}

  public async execute(
    context: TenantContext,
    command: ArchiveInstituteParentCommand,
  ): Promise<InstituteParentDTO> {
    requireCapability(context, CAPABILITIES.PARENT_ARCHIVE);

    const entity = await this.instituteParentRepository.findById(
      context.instituteId,
      command.id,
    );

    if (!entity) {
      throw new NotFoundError(`Institute parent record with ID ${command.id} not found.`);
    }

    entity.inactivate();

    const updated = await this.instituteParentRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        instituteParentId: updated.id,
        operation: 'parent_crm.status_changed',
        status: 'inactive',
      },
      'parent_crm.status_changed',
    );

    const parentIdentity = await this.parentIdentityRepository.findById(
      updated.parentIdentityId,
    );

    return toInstituteParentDTO(updated, parentIdentity || undefined);
  }
}
