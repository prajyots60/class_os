import { logger } from '@coaching-os/observability';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { CAPABILITIES, requireCapability } from '../../authorization';
import { InstituteParentStudentEntity } from '../../domain/entities/institute-parent-student.entity';
import type { GuardianRelationshipType } from '../../domain/value-objects/guardian-relationship-type.vo';
import type { InstituteParentStudentRepository } from '../../domain/repositories/institute-parent-student.repository';
import type { InstituteParentRepository } from '../../domain/repositories/institute-parent.repository';
import type { StudentRepository } from '../../domain/repositories/student.repository';
import type { TenantContext } from './membership.use-cases';
import {
  toInstituteParentStudentDTO,
  type InstituteParentStudentDTO,
} from '../dto/institute-parent-student.dto';

// ============================================================================
// 1. CreateInstituteParentStudentUseCase
// ============================================================================

export interface CreateInstituteParentStudentCommand {
  instituteParentId: string;
  studentId: string;
  relationshipType: GuardianRelationshipType;
  isPrimary?: boolean;
}

export class CreateInstituteParentStudentUseCase {
  constructor(
    private readonly relationshipRepository: InstituteParentStudentRepository,
    private readonly parentRepository: InstituteParentRepository,
    private readonly studentRepository: StudentRepository,
  ) {}

  public async execute(
    context: TenantContext,
    command: CreateInstituteParentStudentCommand,
  ): Promise<InstituteParentStudentDTO> {
    // 1. Authorization Guard
    requireCapability(context, CAPABILITIES.GUARDIAN_CREATE);

    // 2. Validate InstituteParent belongs to server-resolved tenant
    const parent = await this.parentRepository.findById(
      context.instituteId,
      command.instituteParentId,
    );
    if (!parent) {
      throw new NotFoundError(
        `InstituteParent record "${command.instituteParentId}" not found in institute "${context.instituteId}".`,
      );
    }

    // 3. Validate Student belongs to server-resolved tenant
    const student = await this.studentRepository.findById(
      context.instituteId,
      command.studentId,
    );
    if (!student) {
      throw new NotFoundError(
        `Student record "${command.studentId}" not found in institute "${context.instituteId}".`,
      );
    }

    // 4. Duplicate Relationship Check
    const exists = await this.relationshipRepository.exists(
      context.instituteId,
      command.instituteParentId,
      command.studentId,
    );
    if (exists) {
      throw new ConflictError(
        `A relationship already exists for parent "${command.instituteParentId}" and student "${command.studentId}".`,
      );
    }

    // 5. Construct Domain Entity
    const entity = InstituteParentStudentEntity.create({
      instituteId: context.instituteId,
      instituteParentId: command.instituteParentId,
      studentId: command.studentId,
      relationshipType: command.relationshipType,
      isPrimary: command.isPrimary ?? false,
    });

    // 6. Save Entity
    const saved = await this.relationshipRepository.create(entity);

    // 7. Atomic Primary Guardian Promotion if requested
    if (command.isPrimary) {
      await this.relationshipRepository.setPrimaryGuardian(
        context.instituteId,
        command.studentId,
        saved.id,
      );
      const promoted = await this.relationshipRepository.findById(context.instituteId, saved.id);
      if (promoted) {
        logger.info(
          {
            actorUserId: context.userId,
            instituteId: context.instituteId,
            relationshipId: saved.id,
            instituteParentId: saved.instituteParentId,
            studentId: saved.studentId,
            relationshipType: saved.relationshipType,
            isPrimary: true,
            operation: 'identity.relationship.create.success',
          },
          `Created primary guardian relationship "${saved.id}" for student "${saved.studentId}".`,
        );
        return toInstituteParentStudentDTO(promoted);
      }
    }

    // 8. Audit Log
    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        relationshipId: saved.id,
        instituteParentId: saved.instituteParentId,
        studentId: saved.studentId,
        relationshipType: saved.relationshipType,
        isPrimary: saved.isPrimary,
        operation: 'identity.relationship.create.success',
      },
      `Created guardian relationship "${saved.id}" for student "${saved.studentId}".`,
    );

    return toInstituteParentStudentDTO(saved);
  }
}

// ============================================================================
// 2. GetInstituteParentStudentUseCase
// ============================================================================

export class GetInstituteParentStudentUseCase {
  constructor(private readonly relationshipRepository: InstituteParentStudentRepository) {}

  public async execute(
    context: TenantContext,
    relationshipId: string,
  ): Promise<InstituteParentStudentDTO> {
    requireCapability(context, CAPABILITIES.GUARDIAN_READ);

    const record = await this.relationshipRepository.findById(
      context.instituteId,
      relationshipId,
    );

    if (!record) {
      throw new NotFoundError(
        `Relationship record "${relationshipId}" not found in institute "${context.instituteId}".`,
      );
    }

    return toInstituteParentStudentDTO(record);
  }
}

// ============================================================================
// 3. ListStudentGuardiansUseCase
// ============================================================================

export class ListStudentGuardiansUseCase {
  constructor(
    private readonly relationshipRepository: InstituteParentStudentRepository,
    private readonly studentRepository: StudentRepository,
  ) {}

  public async execute(
    context: TenantContext,
    studentId: string,
  ): Promise<InstituteParentStudentDTO[]> {
    requireCapability(context, CAPABILITIES.GUARDIAN_READ);

    const student = await this.studentRepository.findById(context.instituteId, studentId);
    if (!student) {
      throw new NotFoundError(
        `Student record "${studentId}" not found in institute "${context.instituteId}".`,
      );
    }

    const records = await this.relationshipRepository.listByStudentId(
      context.instituteId,
      studentId,
    );

    return records.map(toInstituteParentStudentDTO);
  }
}

// ============================================================================
// 4. ListParentStudentsUseCase
// ============================================================================

export class ListParentStudentsUseCase {
  constructor(
    private readonly relationshipRepository: InstituteParentStudentRepository,
    private readonly parentRepository: InstituteParentRepository,
  ) {}

  public async execute(
    context: TenantContext,
    instituteParentId: string,
  ): Promise<InstituteParentStudentDTO[]> {
    requireCapability(context, CAPABILITIES.GUARDIAN_READ);

    const parent = await this.parentRepository.findById(context.instituteId, instituteParentId);
    if (!parent) {
      throw new NotFoundError(
        `InstituteParent record "${instituteParentId}" not found in institute "${context.instituteId}".`,
      );
    }

    const records = await this.relationshipRepository.listByInstituteParentId(
      context.instituteId,
      instituteParentId,
    );

    return records.map(toInstituteParentStudentDTO);
  }
}

// ============================================================================
// 5. UpdateInstituteParentStudentUseCase
// ============================================================================

export interface UpdateInstituteParentStudentCommand {
  relationshipId: string;
  relationshipType?: GuardianRelationshipType;
}

export class UpdateInstituteParentStudentUseCase {
  constructor(private readonly relationshipRepository: InstituteParentStudentRepository) {}

  public async execute(
    context: TenantContext,
    command: UpdateInstituteParentStudentCommand,
  ): Promise<InstituteParentStudentDTO> {
    requireCapability(context, CAPABILITIES.GUARDIAN_UPDATE);

    const existing = await this.relationshipRepository.findById(
      context.instituteId,
      command.relationshipId,
    );

    if (!existing) {
      throw new NotFoundError(
        `Relationship record "${command.relationshipId}" not found in institute "${context.instituteId}".`,
      );
    }

    if (existing.status === 'archived') {
      throw new ValidationError('Cannot update an archived relationship.');
    }

    if (command.relationshipType) {
      existing.updateRelationshipType(command.relationshipType);
    }

    const updated = await this.relationshipRepository.update(existing);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        relationshipId: updated.id,
        relationshipType: updated.relationshipType,
        operation: 'identity.relationship.update.success',
      },
      `Updated guardian relationship "${updated.id}".`,
    );

    return toInstituteParentStudentDTO(updated);
  }
}

// ============================================================================
// 6. SetPrimaryGuardianUseCase
// ============================================================================

export class SetPrimaryGuardianUseCase {
  constructor(private readonly relationshipRepository: InstituteParentStudentRepository) {}

  public async execute(
    context: TenantContext,
    relationshipId: string,
  ): Promise<InstituteParentStudentDTO> {
    requireCapability(context, CAPABILITIES.GUARDIAN_PRIMARY);

    const existing = await this.relationshipRepository.findById(
      context.instituteId,
      relationshipId,
    );

    if (!existing) {
      throw new NotFoundError(
        `Relationship record "${relationshipId}" not found in institute "${context.instituteId}".`,
      );
    }

    if (existing.status === 'archived') {
      throw new ValidationError('Cannot designate an archived relationship as primary.');
    }

    if (existing.isPrimary) {
      // Idempotent return
      return toInstituteParentStudentDTO(existing);
    }

    await this.relationshipRepository.setPrimaryGuardian(
      context.instituteId,
      existing.studentId,
      relationshipId,
    );

    const updated = await this.relationshipRepository.findById(
      context.instituteId,
      relationshipId,
    );

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        relationshipId,
        studentId: existing.studentId,
        operation: 'identity.relationship.primary.success',
      },
      `Promoted relationship "${relationshipId}" to primary guardian for student "${existing.studentId}".`,
    );

    return toInstituteParentStudentDTO(updated!);
  }
}

// ============================================================================
// 7. ArchiveInstituteParentStudentUseCase
// ============================================================================

export class ArchiveInstituteParentStudentUseCase {
  constructor(private readonly relationshipRepository: InstituteParentStudentRepository) {}

  public async execute(
    context: TenantContext,
    relationshipId: string,
  ): Promise<InstituteParentStudentDTO> {
    requireCapability(context, CAPABILITIES.GUARDIAN_ARCHIVE);

    const existing = await this.relationshipRepository.findById(
      context.instituteId,
      relationshipId,
    );

    if (!existing) {
      throw new NotFoundError(
        `Relationship record "${relationshipId}" not found in institute "${context.instituteId}".`,
      );
    }

    if (existing.status === 'archived') {
      // Idempotent return
      return toInstituteParentStudentDTO(existing);
    }

    await this.relationshipRepository.archive(context.instituteId, relationshipId);

    const archived = await this.relationshipRepository.findById(
      context.instituteId,
      relationshipId,
    );

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        relationshipId,
        studentId: existing.studentId,
        operation: 'identity.relationship.archive.success',
      },
      `Archived guardian relationship "${relationshipId}".`,
    );

    return toInstituteParentStudentDTO(archived!);
  }
}
