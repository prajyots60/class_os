import { logger } from '@coaching-os/observability';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import {
  InstituteMembershipEntity,
  type MembershipRole,
  type MembershipStatus,
} from '../../domain/entities/institute-membership.entity';
import type { InstituteMembershipRepository } from '../../domain/repositories/institute-membership.repository';
import { CAPABILITIES, requireCapability } from '../../authorization';
import type { TenantContext } from './membership.use-cases';

export interface ListStaffMembershipsQuery {
  instituteId: string;
  role?: MembershipRole;
  status?: MembershipStatus;
  tenantContext?: TenantContext;
  tenantContextId?: string;
}

export class ListStaffMembershipsUseCase {
  constructor(private readonly repository: InstituteMembershipRepository) {}

  public async execute(query: ListStaffMembershipsQuery): Promise<InstituteMembershipEntity[]> {
    if (!query.instituteId || !query.instituteId.trim()) {
      throw new NotFoundError('Institute ID cannot be empty');
    }

    if (query.tenantContext) {
      requireCapability(query.tenantContext, CAPABILITIES.STAFF_READ);
      if (query.tenantContext.instituteId !== query.instituteId) {
        throw new AuthorizationError('Access denied to members of requested institute.');
      }
    } else if (query.tenantContextId && query.tenantContextId !== query.instituteId) {
      throw new AuthorizationError('Access denied to members of requested institute.');
    } else if (!query.tenantContext && !query.tenantContextId) {
      throw new AuthorizationError('Authentication session and tenant context are required.');
    }

    if (this.repository.findStaffByInstituteId) {
      return this.repository.findStaffByInstituteId(query.instituteId, {
        role: query.role,
        status: query.status,
      });
    }

    const members = await this.repository.findByInstituteId(query.instituteId);
    return members.filter((m) => {
      if (!m.isStaff) return false;
      if (query.role && m.role !== query.role) return false;
      if (query.status && m.status !== query.status) return false;
      return true;
    });
  }
}

export interface GetStaffMembershipQuery {
  id: string;
  tenantContext?: TenantContext;
  tenantContextId?: string;
}

export class GetStaffMembershipUseCase {
  constructor(private readonly repository: InstituteMembershipRepository) {}

  public async execute(query: GetStaffMembershipQuery): Promise<InstituteMembershipEntity> {
    if (!query.id || !query.id.trim()) {
      throw new NotFoundError('Staff membership ID cannot be empty');
    }

    const targetInstituteId = query.tenantContext?.instituteId || query.tenantContextId;
    let membership: InstituteMembershipEntity | null = null;

    if (targetInstituteId && this.repository.findStaffById) {
      membership = await this.repository.findStaffById(targetInstituteId, query.id);
    } else {
      membership = await this.repository.findById(query.id);
    }

    if (!membership || !membership.isStaff) {
      throw new NotFoundError('Staff membership not found.');
    }

    if (query.tenantContext) {
      requireCapability(query.tenantContext, CAPABILITIES.STAFF_READ);
      if (query.tenantContext.instituteId !== membership.instituteId) {
        throw new NotFoundError('Staff membership not found.');
      }
    } else if (query.tenantContextId && query.tenantContextId !== membership.instituteId) {
      throw new AuthorizationError('Access denied to requested staff membership.');
    } else if (!query.tenantContext && !query.tenantContextId) {
      throw new AuthorizationError('Authentication session and tenant context are required.');
    }

    return membership;
  }
}

export interface InviteStaffMemberCommand {
  userId: string;
  role: MembershipRole;
  tenantContext?: TenantContext;
  tenantContextId?: string;
}

export class InviteStaffMemberUseCase {
  constructor(private readonly repository: InstituteMembershipRepository) {}

  public async execute(command: InviteStaffMemberCommand): Promise<InstituteMembershipEntity> {
    if (!command.userId || !command.userId.trim()) {
      throw new ValidationError('User ID cannot be empty');
    }

    if (!['owner', 'teacher', 'assistant'].includes(command.role)) {
      throw new ValidationError(`Invalid staff role: ${command.role}`);
    }

    let instituteId: string;

    if (command.tenantContext) {
      requireCapability(command.tenantContext, CAPABILITIES.STAFF_INVITE);
      instituteId = command.tenantContext.instituteId;

      if (command.role === 'owner') {
        requireCapability(command.tenantContext, CAPABILITIES.INSTITUTE_UPDATE);
      }
    } else if (command.tenantContextId) {
      instituteId = command.tenantContextId;
    } else {
      throw new AuthorizationError('Authentication session and tenant context are required.');
    }

    const existing = await this.repository.findByUserAndInstitute(command.userId, instituteId);
    if (existing && existing.status !== 'removed') {
      logger.warn(
        { userId: command.userId, instituteId },
        'identity.staff.invite.conflict',
      );
      throw new ConflictError(`User ${command.userId} is already a member of institute ${instituteId}.`);
    }

    const entity = InstituteMembershipEntity.create({
      userId: command.userId,
      instituteId,
      role: command.role,
      status: 'active',
    });

    const created = await this.repository.create(entity);

    logger.info(
      {
        membershipId: created.id,
        userId: created.userId,
        instituteId: created.instituteId,
        role: created.role,
      },
      'identity.staff.invite.success',
    );

    return created;
  }
}

export interface UpdateStaffRoleCommand {
  id: string;
  role: MembershipRole;
  tenantContext?: TenantContext;
  tenantContextId?: string;
}

export class UpdateStaffRoleUseCase {
  constructor(private readonly repository: InstituteMembershipRepository) {}

  public async execute(command: UpdateStaffRoleCommand): Promise<InstituteMembershipEntity> {
    if (!command.id || !command.id.trim()) {
      throw new NotFoundError('Staff membership ID cannot be empty');
    }

    if (!['owner', 'teacher', 'assistant'].includes(command.role)) {
      throw new ValidationError(`Invalid staff role: ${command.role}`);
    }

    const existing = await this.repository.findById(command.id);
    if (!existing || !existing.isStaff || existing.status === 'removed') {
      throw new NotFoundError(`Staff membership with ID ${command.id} not found.`);
    }

    if (command.tenantContext) {
      requireCapability(command.tenantContext, CAPABILITIES.STAFF_ROLE_CHANGE);

      if (command.tenantContext.instituteId !== existing.instituteId) {
        throw new NotFoundError(`Staff membership with ID ${command.id} not found.`);
      }

      // Self-role escalation protection: Cannot update own role
      if (command.tenantContext.userId === existing.userId) {
        throw new AuthorizationError('Users cannot modify their own staff role.');
      }

      // Promoting to owner requires institute:update capability
      if (command.role === 'owner') {
        requireCapability(command.tenantContext, CAPABILITIES.INSTITUTE_UPDATE);
      }
    } else if (command.tenantContextId && command.tenantContextId !== existing.instituteId) {
      throw new NotFoundError(`Staff membership with ID ${command.id} not found.`);
    } else if (!command.tenantContext && !command.tenantContextId) {
      throw new AuthorizationError('Authentication session and tenant context are required.');
    }

    const updated = await this.repository.updateRole(command.id, command.role);

    logger.info(
      {
        membershipId: updated.id,
        role: updated.role,
      },
      'identity.staff.role_updated',
    );

    return updated;
  }
}

export interface ChangeStaffStatusCommand {
  id: string;
  status: MembershipStatus;
  tenantContext?: TenantContext;
  tenantContextId?: string;
}

export class ChangeStaffStatusUseCase {
  constructor(private readonly repository: InstituteMembershipRepository) {}

  public async execute(command: ChangeStaffStatusCommand): Promise<InstituteMembershipEntity> {
    if (!command.id || !command.id.trim()) {
      throw new NotFoundError('Staff membership ID cannot be empty');
    }

    const existing = await this.repository.findById(command.id);
    if (!existing || !existing.isStaff || existing.status === 'removed') {
      throw new NotFoundError(`Staff membership with ID ${command.id} not found.`);
    }

    if (command.tenantContext) {
      const requiredCap =
        command.status === 'removed' || command.status === 'suspended'
          ? CAPABILITIES.STAFF_REMOVE
          : CAPABILITIES.STAFF_UPDATE;
      requireCapability(command.tenantContext, requiredCap);

      if (command.tenantContext.instituteId !== existing.instituteId) {
        throw new NotFoundError(`Staff membership with ID ${command.id} not found.`);
      }

      // Self-status mutation protection: Cannot suspend or remove own membership
      if (command.tenantContext.userId === existing.userId) {
        throw new AuthorizationError('Users cannot modify their own membership status.');
      }
    } else if (command.tenantContextId && command.tenantContextId !== existing.instituteId) {
      throw new NotFoundError(`Staff membership with ID ${command.id} not found.`);
    } else if (!command.tenantContext && !command.tenantContextId) {
      throw new AuthorizationError('Authentication session and tenant context are required.');
    }

    const updated = await this.repository.updateStatus(command.id, command.status);

    logger.info(
      {
        membershipId: updated.id,
        status: updated.status,
      },
      'identity.staff.status_changed',
    );

    return updated;
  }
}

export interface RemoveStaffMemberCommand {
  id: string;
  tenantContext?: TenantContext;
  tenantContextId?: string;
}

export class RemoveStaffMemberUseCase {
  constructor(private readonly repository: InstituteMembershipRepository) {}

  public async execute(command: RemoveStaffMemberCommand): Promise<void> {
    if (!command.id || !command.id.trim()) {
      throw new NotFoundError('Staff membership ID cannot be empty');
    }

    const existing = await this.repository.findById(command.id);
    if (!existing || !existing.isStaff || existing.status === 'removed') {
      throw new NotFoundError(`Staff membership with ID ${command.id} not found.`);
    }

    if (command.tenantContext) {
      requireCapability(command.tenantContext, CAPABILITIES.STAFF_REMOVE);

      if (command.tenantContext.instituteId !== existing.instituteId) {
        throw new NotFoundError(`Staff membership with ID ${command.id} not found.`);
      }

      // Self-removal protection: Cannot remove own membership
      if (command.tenantContext.userId === existing.userId) {
        throw new AuthorizationError('Users cannot remove their own membership.');
      }
    } else if (command.tenantContextId && command.tenantContextId !== existing.instituteId) {
      throw new NotFoundError(`Staff membership with ID ${command.id} not found.`);
    } else if (!command.tenantContext && !command.tenantContextId) {
      throw new AuthorizationError('Authentication session and tenant context are required.');
    }

    await this.repository.updateStatus(command.id, 'removed');

    logger.info(
      {
        membershipId: existing.id,
        userId: existing.userId,
        instituteId: existing.instituteId,
      },
      'identity.staff.removed',
    );
  }
}
