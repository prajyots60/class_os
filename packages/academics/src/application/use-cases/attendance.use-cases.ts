import { logger } from '@coaching-os/observability';
import { NotFoundError, ValidationError } from '@coaching-os/shared';
import {
  CAPABILITIES,
  requireCapability,
  type EnrollmentRepository,
  type TenantContext,
} from '@coaching-os/identity';
import {
  AttendanceEntity,
  type AttendanceDTO,
  type AttendanceStatus,
} from '../../domain/entities/attendance.entity';
import type { AttendanceRepository } from '../../domain/repositories/attendance.repository';
import type { BatchSessionRepository } from '../../domain/repositories/batch-session.repository';

export function toAttendanceDTO(entity: AttendanceEntity): AttendanceDTO {
  return entity.toDTO();
}

export interface AttendanceRecordItem {
  enrollmentId: string;
  status: AttendanceStatus;
}

export interface RecordSessionAttendanceCommand {
  sessionId: string;
  records: AttendanceRecordItem[];
}

// ============================================================================
// 1. RecordSessionAttendanceUseCase
// ============================================================================

export class RecordSessionAttendanceUseCase {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly batchSessionRepository: BatchSessionRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
  ) {}

  public async execute(
    context: TenantContext,
    command: RecordSessionAttendanceCommand,
  ): Promise<AttendanceDTO[]> {
    requireCapability(context, CAPABILITIES.ACADEMIC_WRITE);

    // 1. Verify target BatchSession exists in tenant
    const session = await this.batchSessionRepository.findById(context.instituteId, command.sessionId);
    if (!session || session.instituteId !== context.instituteId) {
      throw new NotFoundError(`BatchSession record "${command.sessionId}" not found in institute.`);
    }

    // 2. Reject attendance submission for cancelled sessions (ACADEMIC-009)
    if (session.status === 'cancelled') {
      throw new ValidationError(`Cannot record attendance for a cancelled session.`);
    }

    // 3. Payload validation: non-empty & check for duplicate enrollment IDs
    if (!command.records || command.records.length === 0) {
      throw new ValidationError('Attendance payload must contain at least one enrollment record.');
    }

    const enrollmentIdSet = new Set<string>();
    for (const item of command.records) {
      if (enrollmentIdSet.has(item.enrollmentId)) {
        throw new ValidationError(`Duplicate enrollment ID "${item.enrollmentId}" in attendance payload.`);
      }
      enrollmentIdSet.add(item.enrollmentId);
    }

    // 4. Resolve all active enrollments for the session's target Batch (ATTENDANCE-003)
    const activeBatchEnrollments = await this.enrollmentRepository.findActiveByBatch(
      context.instituteId,
      session.batchId,
    );

    const validActiveEnrollmentIds = new Set(activeBatchEnrollments.map((e) => e.id));

    // 5. Pre-validate EVERY enrollment before writing (ATTENDANCE-001 & ACADEMIC-005 & ACADEMIC-008)
    for (const item of command.records) {
      if (!validActiveEnrollmentIds.has(item.enrollmentId)) {
        // Look up enrollment across tenant to give explicit descriptive error
        const enrollment = await this.enrollmentRepository.findById(context.instituteId, item.enrollmentId);

        if (!enrollment || enrollment.instituteId !== context.instituteId) {
          throw new NotFoundError(`Enrollment record "${item.enrollmentId}" not found in institute.`);
        }

        if (enrollment.batchId !== session.batchId) {
          throw new ValidationError(
            `Enrollment "${item.enrollmentId}" belongs to batch "${enrollment.batchId}", not target session batch "${session.batchId}" (ACADEMIC-005).`,
          );
        }

        if (enrollment.status !== 'active') {
          throw new ValidationError(
            `Enrollment "${item.enrollmentId}" is not active (status: ${enrollment.status}) (ACADEMIC-008).`,
          );
        }
      }
    }

    // 6. Build Attendance domain entities
    const attendanceEntities = command.records.map((item) =>
      AttendanceEntity.create({
        instituteId: context.instituteId,
        sessionId: command.sessionId,
        enrollmentId: item.enrollmentId,
        status: item.status,
      }),
    );

    // 7. Persist atomically: bulk upsert attendance rows + update BatchSession.attendanceTaken = true
    const savedEntities = await this.attendanceRepository.upsertMany(
      context.instituteId,
      command.sessionId,
      attendanceEntities,
    );

    logger.info('academics.attendance.recorded.success', {
      requestId: crypto.randomUUID(),
      instituteId: context.instituteId,
      userId: context.userId,
      sessionId: command.sessionId,
      batchId: session.batchId,
      recordCount: savedEntities.length,
    });

    return savedEntities.map(toAttendanceDTO);
  }
}

// ============================================================================
// 2. GetSessionAttendanceUseCase
// ============================================================================

export class GetSessionAttendanceUseCase {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly batchSessionRepository: BatchSessionRepository,
  ) {}

  public async execute(context: TenantContext, sessionId: string): Promise<AttendanceDTO[]> {
    requireCapability(context, CAPABILITIES.ACADEMIC_READ);

    const session = await this.batchSessionRepository.findById(context.instituteId, sessionId);
    if (!session || session.instituteId !== context.instituteId) {
      throw new NotFoundError(`BatchSession record "${sessionId}" not found in institute.`);
    }

    const records = await this.attendanceRepository.findBySessionId(context.instituteId, sessionId);
    return records.map(toAttendanceDTO);
  }
}
