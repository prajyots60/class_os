import { logger } from '@coaching-os/observability';
import { NotFoundError, ConflictError } from '@coaching-os/shared';
import { db } from '@coaching-os/database';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';
import {
  ParentIdentityEntity,
  type ParentIdentityStatus,
} from '../../domain/entities/parent-identity.entity';
import type { ParentIdentityRepository } from '../../domain/repositories/parent-identity.repository';
import {
  toParentIdentityDTO,
  type ParentIdentityDTO,
} from '../dto/parent-identity.dto';

// ============================================================================
// 1. CreateParentIdentityUseCase
// ============================================================================

export interface CreateParentIdentityCommand {
  phone: string;
  name?: string | null;
  avatar?: string | null;
}

export class CreateParentIdentityUseCase {
  constructor(private readonly repository: ParentIdentityRepository) {}

  public async execute(command: CreateParentIdentityCommand): Promise<ParentIdentityDTO> {
    const phoneVO = PhoneNumber.create(command.phone);

    // Idempotency check: Return existing if already created
    const existing = await this.repository.findByPhone(phoneVO);
    if (existing) {
      return toParentIdentityDTO(existing);
    }

    const entity = ParentIdentityEntity.create({
      phone: phoneVO,
      name: command.name ?? null,
      avatar: command.avatar ?? null,
    });

    let saved: ParentIdentityEntity;
    try {
      saved = await this.repository.create(entity);
    } catch (err) {
      if (err instanceof ConflictError) {
        // Concurrent creation safety: fetch identity created by competing request
        const concurrent = await this.repository.findByPhone(phoneVO);
        if (concurrent) {
          return toParentIdentityDTO(concurrent);
        }
      }
      throw err;
    }

    logger.info(
      {
        parentIdentityId: saved.id,
        operation: 'identity.parent.created',
      },
      'identity.parent.created',
    );

    return toParentIdentityDTO(saved);
  }
}

// ============================================================================
// 2. GetParentIdentityUseCase
// ============================================================================

export interface GetParentIdentityQuery {
  id: string;
}

export class GetParentIdentityUseCase {
  constructor(private readonly repository: ParentIdentityRepository) {}

  public async execute(query: GetParentIdentityQuery): Promise<ParentIdentityDTO> {
    const identity = await this.repository.findById(query.id);
    if (!identity) {
      throw new NotFoundError(`Parent identity with ID ${query.id} not found.`);
    }
    return toParentIdentityDTO(identity);
  }
}

// ============================================================================
// 3. GetParentIdentityByPhoneUseCase
// ============================================================================

export interface GetParentIdentityByPhoneQuery {
  phone: string;
}

export class GetParentIdentityByPhoneUseCase {
  constructor(private readonly repository: ParentIdentityRepository) {}

  public async execute(query: GetParentIdentityByPhoneQuery): Promise<ParentIdentityDTO> {
    const phoneVO = PhoneNumber.create(query.phone);
    const identity = await this.repository.findByPhone(phoneVO);
    if (!identity) {
      throw new NotFoundError(`Parent identity with phone ${phoneVO.value} not found.`);
    }
    return toParentIdentityDTO(identity);
  }
}

// ============================================================================
// 4. UpdateParentIdentityProfileUseCase
// ============================================================================

export interface UpdateParentIdentityProfileCommand {
  id: string;
  name?: string | null;
  avatar?: string | null;
}

export class UpdateParentIdentityProfileUseCase {
  constructor(private readonly repository: ParentIdentityRepository) {}

  public async execute(
    command: UpdateParentIdentityProfileCommand,
  ): Promise<ParentIdentityDTO> {
    const identity = await this.repository.findById(command.id);
    if (!identity) {
      throw new NotFoundError(`Parent identity with ID ${command.id} not found.`);
    }

    identity.updateProfile({
      name: command.name,
      avatar: command.avatar,
    });

    const updated = await this.repository.update(identity);

    logger.info(
      {
        parentIdentityId: updated.id,
        operation: 'identity.parent.profile.updated',
      },
      'identity.parent.profile.updated',
    );

    return toParentIdentityDTO(updated);
  }
}

// ============================================================================
// 5. ChangeParentIdentityStatusUseCase
// ============================================================================

export interface ChangeParentIdentityStatusCommand {
  id: string;
  status: ParentIdentityStatus;
}

export class ChangeParentIdentityStatusUseCase {
  constructor(private readonly repository: ParentIdentityRepository) {}

  public async execute(
    command: ChangeParentIdentityStatusCommand,
  ): Promise<ParentIdentityDTO> {
    const identity = await this.repository.findById(command.id);
    if (!identity) {
      throw new NotFoundError(`Parent identity with ID ${command.id} not found.`);
    }

    identity.changeStatus(command.status);

    const updated = await this.repository.update(identity);

    logger.info(
      {
        parentIdentityId: updated.id,
        newStatus: command.status,
        operation: 'identity.parent.status.changed',
      },
      'identity.parent.status.changed',
    );

    return toParentIdentityDTO(updated);
  }
}

// ============================================================================
// 6. ResolveParentIdentityForUserUseCase
// ============================================================================

export interface ResolveParentIdentityForUserCommand {
  userId: string;
  userPhone?: string | null;
  userName?: string | null;
  autoCreateIfMissing?: boolean;
}

export class ResolveParentIdentityForUserUseCase {
  constructor(private readonly repository: ParentIdentityRepository) {}

  public async execute(
    command: ResolveParentIdentityForUserCommand,
  ): Promise<ParentIdentityDTO | null> {
    const user = await db.user.findUnique({
      where: { id: command.userId },
      select: {
        id: true,
        parentIdentityId: true,
        phone: true,
        name: true,
        status: true,
      },
    });

    if (!user || user.status !== 'active') {
      return null;
    }

    // 1. Direct durable link resolution
    if (user.parentIdentityId) {
      const identity = await this.repository.findById(user.parentIdentityId);
      if (identity) {
        return toParentIdentityDTO(identity);
      }
    }

    // 2. Candidate phone resolution
    const candidatePhone = command.userPhone ?? user.phone;
    if (!candidatePhone) {
      return null;
    }

    let phoneVO: PhoneNumber;
    try {
      phoneVO = PhoneNumber.create(candidatePhone);
    } catch {
      return null;
    }

    // 3. Lookup identity by canonical phone
    let identity = await this.repository.findByPhone(phoneVO);

    // 4. Auto-create identity if authorized & missing
    if (!identity && command.autoCreateIfMissing) {
      const createUseCase = new CreateParentIdentityUseCase(this.repository);
      const createdDTO = await createUseCase.execute({
        phone: phoneVO.value,
        name: command.userName ?? user.name ?? null,
      });
      identity = await this.repository.findById(createdDTO.id);
    }

    if (!identity) {
      return null;
    }

    // 5. Establish durable link on User record
    await db.user.update({
      where: { id: user.id },
      data: { parentIdentityId: identity.id },
    });

    logger.info(
      {
        userId: user.id,
        parentIdentityId: identity.id,
        operation: 'identity.parent.auth.linked',
      },
      'identity.parent.auth.linked',
    );

    return toParentIdentityDTO(identity);
  }
}
