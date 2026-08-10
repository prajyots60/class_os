import { logger } from '@coaching-os/observability';
import { AuthorizationError, ConflictError, NotFoundError } from '@coaching-os/shared';
import {
  InstituteMembershipEntity,
  type CreateInstituteMembershipProps,
  type MembershipRole,
  type MembershipStatus,
} from '../../domain/entities/institute-membership.entity';
import type { InstituteMembershipRepository } from '../../domain/repositories/institute-membership.repository';

export interface TenantContext {
  userId: string;
  instituteId: string;
  membershipId: string;
  role: MembershipRole;
  status: MembershipStatus;
}

export class CreateInstituteMembershipUseCase {
  constructor(private readonly repository: InstituteMembershipRepository) {}

  public async execute(props: CreateInstituteMembershipProps): Promise<InstituteMembershipEntity> {
    const entity = InstituteMembershipEntity.create(props);

    // Fail-fast check for existing membership
    const existing = await this.repository.findByUserAndInstitute(
      entity.userId,
      entity.instituteId,
    );

    if (existing && existing.status !== 'removed') {
      logger.warn(
        { userId: entity.userId, instituteId: entity.instituteId },
        'identity.membership.create.conflict',
      );
      throw new ConflictError(
        `User ${entity.userId} is already a member of institute ${entity.instituteId}.`,
      );
    }

    const created = await this.repository.create(entity);

    logger.info(
      {
        membershipId: created.id,
        userId: created.userId,
        instituteId: created.instituteId,
        role: created.role,
      },
      'identity.membership.create.success',
    );

    return created;
  }
}

export interface GetUserMembershipsQuery {
  userId: string;
  activeOnly?: boolean;
}

export class GetUserMembershipsUseCase {
  constructor(private readonly repository: InstituteMembershipRepository) {}

  public async execute(query: GetUserMembershipsQuery): Promise<InstituteMembershipEntity[]> {
    if (!query.userId || !query.userId.trim()) {
      throw new NotFoundError('User ID cannot be empty');
    }

    const memberships = await this.repository.findByUserId(query.userId);

    if (query.activeOnly ?? true) {
      return memberships.filter((m) => m.isActive);
    }

    return memberships;
  }
}

export interface GetInstituteMembersQuery {
  instituteId: string;
  tenantContextId?: string;
}

export class GetInstituteMembersUseCase {
  constructor(private readonly repository: InstituteMembershipRepository) {}

  public async execute(query: GetInstituteMembersQuery): Promise<InstituteMembershipEntity[]> {
    if (!query.instituteId || !query.instituteId.trim()) {
      throw new NotFoundError('Institute ID cannot be empty');
    }

    // Security invariant: Caller's trusted tenant context must match requested institute
    if (query.tenantContextId && query.tenantContextId !== query.instituteId) {
      throw new AuthorizationError('Access denied to members of requested institute.');
    }

    return this.repository.findByInstituteId(query.instituteId);
  }
}

export interface GetInstituteMembershipQuery {
  id?: string;
  userId?: string;
  instituteId?: string;
  tenantContextId?: string;
}

export class GetInstituteMembershipUseCase {
  constructor(private readonly repository: InstituteMembershipRepository) {}

  public async execute(query: GetInstituteMembershipQuery): Promise<InstituteMembershipEntity> {
    let found: InstituteMembershipEntity | null = null;

    if (query.id) {
      found = await this.repository.findById(query.id);
    } else if (query.userId && query.instituteId) {
      found = await this.repository.findByUserAndInstitute(query.userId, query.instituteId);
    }

    if (!found) {
      throw new NotFoundError('Institute membership not found.');
    }

    if (query.tenantContextId && query.tenantContextId !== found.instituteId) {
      throw new AuthorizationError('Access denied to requested membership.');
    }

    return found;
  }
}

export interface ChangeMembershipStatusCommand {
  id: string;
  status: MembershipStatus;
  tenantContextId?: string;
}

export class ChangeMembershipStatusUseCase {
  constructor(private readonly repository: InstituteMembershipRepository) {}

  public async execute(command: ChangeMembershipStatusCommand): Promise<InstituteMembershipEntity> {
    const existing = await this.repository.findById(command.id);
    if (!existing) {
      throw new NotFoundError(`Membership with ID ${command.id} not found.`);
    }

    if (command.tenantContextId && command.tenantContextId !== existing.instituteId) {
      throw new AuthorizationError('Access denied to change membership status.');
    }

    const updated = await this.repository.updateStatus(command.id, command.status);

    logger.info(
      {
        membershipId: updated.id,
        status: updated.status,
      },
      'identity.membership.status_changed',
    );

    return updated;
  }
}

export interface ResolveInstituteMembershipQuery {
  userId: string;
  requestedInstituteId: string;
}

export class ResolveInstituteMembershipUseCase {
  constructor(private readonly repository: InstituteMembershipRepository) {}

  public async execute(query: ResolveInstituteMembershipQuery): Promise<TenantContext> {
    if (!query.userId || !query.requestedInstituteId) {
      throw new AuthorizationError('Invalid authorization request credentials.');
    }

    const membership = await this.repository.findByUserAndInstitute(
      query.userId,
      query.requestedInstituteId,
    );

    if (!membership || !membership.isActive) {
      logger.warn(
        {
          userId: query.userId,
          requestedInstituteId: query.requestedInstituteId,
        },
        'security.membership.authorization_denied',
      );
      throw new AuthorizationError(
        `User ${query.userId} is not an active member of requested institute ${query.requestedInstituteId}.`,
      );
    }

    logger.info(
      {
        userId: query.userId,
        instituteId: query.requestedInstituteId,
        role: membership.role,
      },
      'identity.membership.resolve.success',
    );

    return {
      userId: query.userId,
      instituteId: query.requestedInstituteId,
      membershipId: membership.id,
      role: membership.role,
      status: membership.status,
    };
  }
}
