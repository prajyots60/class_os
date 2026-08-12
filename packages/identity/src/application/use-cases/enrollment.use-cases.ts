import { logger } from '@coaching-os/observability';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { CAPABILITIES, requireCapability } from '../../authorization';
import type { EnrollmentStatus } from '../../domain/entities/enrollment.entity';
import { EnrollmentEntity } from '../../domain/entities/enrollment.entity';
import type {
  EnrollmentRepository,
  ListEnrollmentsOptions,
} from '../../domain/repositories/enrollment.repository';
import type { StudentRepository } from '../../domain/repositories/student.repository';
import type { BatchRepository } from '../../domain/repositories/batch.repository';
import type { TenantContext } from './membership.use-cases';
import { toEnrollmentDTO, type EnrollmentDTO } from '../dto/enrollment.dto';

// ============================================================================
// 1. CreateEnrollmentUseCase
// ============================================================================

export interface CreateEnrollmentCommand {
  studentId: string;
  batchId: string;
  status?: EnrollmentStatus;
  enrolledAt?: Date | string | null;
}

export class CreateEnrollmentUseCase {
  constructor(
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly studentRepository: StudentRepository,
    private readonly batchRepository: BatchRepository,
  ) {}

  public async execute(
    context: TenantContext,
    command: CreateEnrollmentCommand,
  ): Promise<EnrollmentDTO> {
    // 1. Authorization Check (Layer 1)
    requireCapability(context, CAPABILITIES.ENROLLMENT_CREATE);

    // 2. Validate Student Existence & Eligibility strictly within tenant
    const student = await this.studentRepository.findById(context.instituteId, command.studentId);
    if (!student) {
      throw new NotFoundError(
        `Target student "${command.studentId}" not found in institute "${context.instituteId}".`,
      );
    }

    if (student.admissionStatus !== 'admitted') {
      throw new ValidationError(
        `Student "${command.studentId}" has admission status "${student.admissionStatus}" and cannot be enrolled.`,
      );
    }

    if (student.status !== 'active') {
      throw new ValidationError(
        `Student "${command.studentId}" is in status "${student.status}" and cannot be enrolled.`,
      );
    }

    // 3. Validate Batch Existence & Eligibility strictly within tenant
    const batch = await this.batchRepository.findById(context.instituteId, command.batchId);
    if (!batch) {
      throw new NotFoundError(
        `Target batch "${command.batchId}" not found in institute "${context.instituteId}".`,
      );
    }

    if (batch.status !== 'open' && batch.status !== 'running') {
      throw new ValidationError(
        `Target batch "${command.batchId}" is in status "${batch.status}" and cannot accept enrollments.`,
      );
    }

    // 4. Duplicate Check: Active or Pending Enrollment in same batch
    const exists = await this.enrollmentRepository.existsActiveOrPending(
      context.instituteId,
      command.studentId,
      command.batchId,
    );

    if (exists) {
      throw new ConflictError(
        `Student "${command.studentId}" is already actively enrolled in batch "${command.batchId}".`,
      );
    }

    // 5. Instantiate Domain Aggregate
    const entity = EnrollmentEntity.create({
      instituteId: context.instituteId,
      studentId: command.studentId,
      batchId: command.batchId,
      status: command.status || 'pending',
      enrolledAt: command.enrolledAt,
    });

    // 6. Save with pessimistic row-level locking capacity check
    const saved = await this.enrollmentRepository.createWithCapacityCheck(entity);

    // 7. Structured Audit Log
    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        enrollmentId: saved.id,
        studentId: saved.studentId,
        batchId: saved.batchId,
        status: saved.status,
        operation: 'identity.enrollment.create.success',
      },
      'identity.enrollment.create.success',
    );

    return toEnrollmentDTO(saved);
  }
}

// ============================================================================
// 2. GetEnrollmentUseCase
// ============================================================================

export interface GetEnrollmentQuery {
  id: string;
}

export class GetEnrollmentUseCase {
  constructor(
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly batchRepository?: BatchRepository,
  ) {}

  public async execute(
    context: TenantContext,
    query: GetEnrollmentQuery,
  ): Promise<EnrollmentDTO> {
    requireCapability(context, CAPABILITIES.ENROLLMENT_READ);

    const entity = await this.enrollmentRepository.findById(context.instituteId, query.id);

    if (!entity) {
      throw new NotFoundError(`Enrollment record with ID "${query.id}" not found.`);
    }

    // Role-specific Resource Scoping Guard
    if (context.role === 'teacher') {
      if (this.batchRepository) {
        const batch = await this.batchRepository.findById(context.instituteId, entity.batchId);
        if (!batch || batch.teacherId !== context.userId) {
          throw new NotFoundError(`Enrollment record with ID "${query.id}" not found.`);
        }
      }
    } else if (context.role === 'parent') {
      throw new AuthorizationError('Permission denied: Parents cannot directly access staff enrollment records.');
    }

    return toEnrollmentDTO(entity);
  }
}

// ============================================================================
// 3. ListEnrollmentsUseCase
// ============================================================================

export interface ListEnrollmentsQuery extends ListEnrollmentsOptions {}

export class ListEnrollmentsUseCase {
  constructor(
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly batchRepository?: BatchRepository,
  ) {}

  public async execute(
    context: TenantContext,
    query?: ListEnrollmentsQuery,
  ): Promise<EnrollmentDTO[]> {
    requireCapability(context, CAPABILITIES.ENROLLMENT_READ);

    if (context.role === 'parent') {
      throw new AuthorizationError('Permission denied: Parents cannot access staff enrollment lists.');
    }

    let scopedOptions: ListEnrollmentsOptions = { ...query };

    // Teacher Resource Scope filtering
    if (context.role === 'teacher' && this.batchRepository) {
      const teacherBatches = await this.batchRepository.listByInstitute(
        context.instituteId,
        { teacherId: context.userId },
      );

      if (teacherBatches.length === 0) {
        return [];
      }

      const assignedBatchIds = teacherBatches.map((b) => b.id);

      if (query?.batchId) {
        if (!assignedBatchIds.includes(query.batchId)) {
          return [];
        }
      }
    }

    const entities = await this.enrollmentRepository.listByInstitute(
      context.instituteId,
      scopedOptions,
    );

    return entities.map((entity) => toEnrollmentDTO(entity));
  }
}

// ============================================================================
// 4. ActivateEnrollmentUseCase
// ============================================================================

export interface ActivateEnrollmentCommand {
  id: string;
  enrolledAt?: Date | string;
}

export class ActivateEnrollmentUseCase {
  constructor(private readonly enrollmentRepository: EnrollmentRepository) {}

  public async execute(
    context: TenantContext,
    command: ActivateEnrollmentCommand,
  ): Promise<EnrollmentDTO> {
    requireCapability(context, CAPABILITIES.ENROLLMENT_STATUS);

    const entity = await this.enrollmentRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Enrollment record with ID "${command.id}" not found.`);
    }

    entity.activate(command.enrolledAt);

    const updated = await this.enrollmentRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        enrollmentId: updated.id,
        studentId: updated.studentId,
        batchId: updated.batchId,
        status: updated.status,
        operation: 'identity.enrollment.activate.success',
      },
      'identity.enrollment.activate.success',
    );

    return toEnrollmentDTO(updated);
  }
}

// ============================================================================
// 5. CompleteEnrollmentUseCase
// ============================================================================

export interface CompleteEnrollmentCommand {
  id: string;
}

export class CompleteEnrollmentUseCase {
  constructor(private readonly enrollmentRepository: EnrollmentRepository) {}

  public async execute(
    context: TenantContext,
    command: CompleteEnrollmentCommand,
  ): Promise<EnrollmentDTO> {
    requireCapability(context, CAPABILITIES.ENROLLMENT_STATUS);

    const entity = await this.enrollmentRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Enrollment record with ID "${command.id}" not found.`);
    }

    entity.complete();

    const updated = await this.enrollmentRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        enrollmentId: updated.id,
        studentId: updated.studentId,
        batchId: updated.batchId,
        status: updated.status,
        operation: 'identity.enrollment.complete.success',
      },
      'identity.enrollment.complete.success',
    );

    return toEnrollmentDTO(updated);
  }
}

// ============================================================================
// 6. WithdrawEnrollmentUseCase
// ============================================================================

export interface WithdrawEnrollmentCommand {
  id: string;
}

export class WithdrawEnrollmentUseCase {
  constructor(private readonly enrollmentRepository: EnrollmentRepository) {}

  public async execute(
    context: TenantContext,
    command: WithdrawEnrollmentCommand,
  ): Promise<EnrollmentDTO> {
    requireCapability(context, CAPABILITIES.ENROLLMENT_STATUS);

    const entity = await this.enrollmentRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Enrollment record with ID "${command.id}" not found.`);
    }

    entity.withdraw();

    const updated = await this.enrollmentRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        enrollmentId: updated.id,
        studentId: updated.studentId,
        batchId: updated.batchId,
        status: updated.status,
        operation: 'identity.enrollment.withdraw.success',
      },
      'identity.enrollment.withdraw.success',
    );

    return toEnrollmentDTO(updated);
  }
}

// ============================================================================
// 7. CancelEnrollmentUseCase
// ============================================================================

export interface CancelEnrollmentCommand {
  id: string;
}

export class CancelEnrollmentUseCase {
  constructor(private readonly enrollmentRepository: EnrollmentRepository) {}

  public async execute(
    context: TenantContext,
    command: CancelEnrollmentCommand,
  ): Promise<EnrollmentDTO> {
    requireCapability(context, CAPABILITIES.ENROLLMENT_STATUS);

    const entity = await this.enrollmentRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Enrollment record with ID "${command.id}" not found.`);
    }

    entity.cancel();

    const updated = await this.enrollmentRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        enrollmentId: updated.id,
        studentId: updated.studentId,
        batchId: updated.batchId,
        status: updated.status,
        operation: 'identity.enrollment.cancel.success',
      },
      'identity.enrollment.cancel.success',
    );

    return toEnrollmentDTO(updated);
  }
}

// ============================================================================
// 8. TransferEnrollmentUseCase (Atomic Historical Preservation)
// ============================================================================

export interface TransferEnrollmentCommand {
  id: string;
  targetBatchId: string;
}

export class TransferEnrollmentUseCase {
  constructor(
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly batchRepository: BatchRepository,
  ) {}

  public async execute(
    context: TenantContext,
    command: TransferEnrollmentCommand,
  ): Promise<{ source: EnrollmentDTO; destination: EnrollmentDTO }> {
    // 1. Authorization Check (Layer 1)
    requireCapability(context, CAPABILITIES.ENROLLMENT_TRANSFER);

    // 2. Fetch Source Enrollment
    const sourceEntity = await this.enrollmentRepository.findById(context.instituteId, command.id);

    if (!sourceEntity) {
      throw new NotFoundError(`Source enrollment record with ID "${command.id}" not found.`);
    }

    if (sourceEntity.status !== 'active') {
      throw new ValidationError(
        `Cannot transfer enrollment with status "${sourceEntity.status}". Only active enrollments can be transferred.`,
      );
    }

    if (sourceEntity.batchId === command.targetBatchId) {
      throw new ValidationError('Source batch and target batch cannot be identical for transfer.');
    }

    // 3. Fetch Target Batch & Verify Operational State
    const targetBatch = await this.batchRepository.findById(context.instituteId, command.targetBatchId);

    if (!targetBatch) {
      throw new NotFoundError(
        `Destination batch "${command.targetBatchId}" not found in institute "${context.instituteId}".`,
      );
    }

    if (targetBatch.status !== 'open' && targetBatch.status !== 'running') {
      throw new ValidationError(
        `Destination batch "${command.targetBatchId}" is in status "${targetBatch.status}" and cannot accept transfer enrollments.`,
      );
    }

    // 4. Create Destination Enrollment Aggregate
    const destinationEntity = EnrollmentEntity.create({
      instituteId: context.instituteId,
      studentId: sourceEntity.studentId,
      batchId: command.targetBatchId,
      status: 'active',
      enrolledAt: new Date(),
    });

    // 5. Transition Source Entity State (preserves historical source batchId)
    sourceEntity.markTransferred(command.targetBatchId, destinationEntity.id);

    // 6. Delegate Atomic Transaction with Row Locking
    const result = await this.enrollmentRepository.transferWithCapacityCheck({
      sourceEnrollment: sourceEntity,
      targetBatchId: command.targetBatchId,
      destinationEnrollment: destinationEntity,
    });

    // 7. Structured Audit Log
    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        sourceEnrollmentId: result.source.id,
        sourceBatchId: result.source.batchId,
        destinationEnrollmentId: result.destination.id,
        destinationBatchId: result.destination.batchId,
        studentId: result.source.studentId,
        operation: 'identity.enrollment.transfer.success',
      },
      'identity.enrollment.transfer.success',
    );

    return {
      source: toEnrollmentDTO(result.source),
      destination: toEnrollmentDTO(result.destination),
    };
  }
}

// Export alias for backward compatibility / specification alignment
export { TransferEnrollmentUseCase as TransferStudentBatchUseCase };

// ============================================================================
// 9. ArchiveEnrollmentUseCase
// ============================================================================

export interface ArchiveEnrollmentCommand {
  id: string;
}

export class ArchiveEnrollmentUseCase {
  constructor(private readonly enrollmentRepository: EnrollmentRepository) {}

  public async execute(
    context: TenantContext,
    command: ArchiveEnrollmentCommand,
  ): Promise<EnrollmentDTO> {
    requireCapability(context, CAPABILITIES.ENROLLMENT_ARCHIVE);

    const entity = await this.enrollmentRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Enrollment record with ID "${command.id}" not found.`);
    }

    entity.archive();

    const updated = await this.enrollmentRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        enrollmentId: updated.id,
        studentId: updated.studentId,
        batchId: updated.batchId,
        operation: 'identity.enrollment.archive.success',
      },
      'identity.enrollment.archive.success',
    );

    return toEnrollmentDTO(updated);
  }
}
