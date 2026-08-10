import { logger } from '@coaching-os/observability';
import { AuthorizationError, ConflictError, NotFoundError } from '@coaching-os/shared';
import {
  InstituteEntity,
  type CreateInstituteProps,
  type InstituteStatus,
  type UpdateInstituteDetailsProps,
} from '../../domain/entities/institute.entity';
import type { InstituteRepository } from '../../domain/repositories/institute.repository';

export class CreateInstituteUseCase {
  constructor(private readonly repository: InstituteRepository) {}

  public async execute(props: CreateInstituteProps): Promise<InstituteEntity> {
    const entity = InstituteEntity.create(props);

    // Check if slug already exists to fail fast with a friendly ConflictError before DB write
    const existing = await this.repository.findBySlug(entity.slug);
    if (existing) {
      throw new ConflictError(`An institute with slug '${entity.slug}' already exists.`);
    }

    const created = await this.repository.create(entity);

    logger.info(
      {
        instituteId: created.id,
        name: created.name,
        slug: created.slug,
      },
      'identity.institute.create.success',
    );

    return created;
  }
}

export interface GetInstituteQuery {
  id?: string;
  slug?: string;
  tenantContextId?: string;
}

export class GetInstituteUseCase {
  constructor(private readonly repository: InstituteRepository) {}

  public async execute(query: GetInstituteQuery): Promise<InstituteEntity> {
    let found: InstituteEntity | null = null;

    if (query.id) {
      found = await this.repository.findById(query.id);
    } else if (query.slug) {
      found = await this.repository.findBySlug(query.slug);
    }

    if (!found) {
      throw new NotFoundError(
        `Institute ${query.id ? `with ID ${query.id}` : `with slug ${query.slug}`} not found.`,
      );
    }

    // Security invariant: If caller provided tenantContextId, it must match the requested institute ID
    if (query.tenantContextId && query.tenantContextId !== found.id) {
      throw new AuthorizationError('Access denied to requested institute resource.');
    }

    return found;
  }
}

export interface UpdateInstituteCommand {
  id: string;
  details: UpdateInstituteDetailsProps;
  tenantContextId?: string;
}

export class UpdateInstituteUseCase {
  constructor(private readonly repository: InstituteRepository) {}

  public async execute(command: UpdateInstituteCommand): Promise<InstituteEntity> {
    if (command.tenantContextId && command.tenantContextId !== command.id) {
      throw new AuthorizationError('Access denied to update requested institute resource.');
    }

    const existing = await this.repository.findById(command.id);
    if (!existing) {
      throw new NotFoundError(`Institute with ID ${command.id} not found.`);
    }

    existing.updateDetails(command.details);
    const updated = await this.repository.update(existing);

    logger.info(
      {
        instituteId: updated.id,
        slug: updated.slug,
      },
      'identity.institute.update.success',
    );

    return updated;
  }
}

export interface ChangeInstituteStatusCommand {
  id: string;
  status: InstituteStatus;
  tenantContextId?: string;
}

export class ChangeInstituteStatusUseCase {
  constructor(private readonly repository: InstituteRepository) {}

  public async execute(command: ChangeInstituteStatusCommand): Promise<InstituteEntity> {
    if (command.tenantContextId && command.tenantContextId !== command.id) {
      throw new AuthorizationError(
        'Access denied to update status of requested institute resource.',
      );
    }

    const existing = await this.repository.findById(command.id);
    if (!existing) {
      throw new NotFoundError(`Institute with ID ${command.id} not found.`);
    }

    if (command.status === 'archived') {
      existing.archive();
    } else if (command.status === 'suspended') {
      existing.suspend();
    } else if (command.status === 'active') {
      existing.activate();
    }

    const updated = await this.repository.updateStatus(existing.id, existing.status);

    logger.info(
      {
        instituteId: updated.id,
        status: updated.status,
      },
      'identity.institute.status_changed',
    );

    return updated;
  }
}
