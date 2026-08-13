import { logger } from '@coaching-os/observability';
import { NotFoundError, ValidationError } from '@coaching-os/shared';
import {
  CAPABILITIES,
  requireCapability,
  type BatchRepository,
  type InstituteMembershipRepository,
  type TenantContext,
} from '@coaching-os/identity';
import { ScheduleEntity, type ScheduleDTO } from '../../domain/entities/schedule.entity';
import { BatchSessionEntity, type BatchSessionDTO, type SessionStatus } from '../../domain/entities/batch-session.entity';
import type { ScheduleRepository } from '../../domain/repositories/schedule.repository';
import type { BatchSessionRepository } from '../../domain/repositories/batch-session.repository';
import { ScheduleGeneratorService } from '../../domain/services/schedule-generator.service';

// ============================================================================
// DTO Helper Maps
// ============================================================================

export function toScheduleDTO(entity: ScheduleEntity): ScheduleDTO {
  return entity.toDTO();
}

export function toBatchSessionDTO(entity: BatchSessionEntity): BatchSessionDTO {
  return entity.toDTO();
}

// ============================================================================
// 1. CreateScheduleUseCase
// ============================================================================

export interface CreateScheduleCommand {
  batchId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  teacherId?: string | null;
}

export class CreateScheduleUseCase {
  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly batchRepository: BatchRepository,
    private readonly membershipRepository?: InstituteMembershipRepository,
  ) {}

  public async execute(
    context: TenantContext,
    command: CreateScheduleCommand,
  ): Promise<ScheduleDTO> {
    requireCapability(context, CAPABILITIES.ACADEMIC_WRITE);

    // 1. Verify target batch exists in user's tenant
    const batch = await this.batchRepository.findById(context.instituteId, command.batchId);
    if (!batch || batch.instituteId !== context.instituteId) {
      throw new NotFoundError(`Batch with ID "${command.batchId}" not found in institute.`);
    }

    // 2. If teacher specified, verify teacher membership/user belongs to tenant and is active
    if (command.teacherId && this.membershipRepository) {
      // Allow passing either user ID or membership ID
      let membership = await this.membershipRepository.findByUserAndInstitute(
        command.teacherId,
        context.instituteId,
      );

      if (!membership) {
        membership = await this.membershipRepository.findById(command.teacherId);
      }

      if (!membership || membership.instituteId !== context.instituteId) {
        throw new NotFoundError(`Teacher with ID "${command.teacherId}" not found in institute.`);
      }

      if (membership.status !== 'active') {
        throw new ValidationError(`Teacher membership "${command.teacherId}" is not active.`);
      }
    }

    // 3. Create schedule entity & save
    const schedule = ScheduleEntity.create({
      batchId: command.batchId,
      dayOfWeek: command.dayOfWeek,
      startTime: command.startTime,
      endTime: command.endTime,
      teacherId: command.teacherId,
    });

    const saved = await this.scheduleRepository.create(schedule);

    logger.info('academics.schedule.create.success', {
      requestId: crypto.randomUUID(),
      instituteId: context.instituteId,
      userId: context.userId,
      batchId: command.batchId,
      scheduleId: saved.id,
      dayOfWeek: saved.dayOfWeek.value,
    });

    return toScheduleDTO(saved);
  }
}

// ============================================================================
// 2. UpdateScheduleUseCase
// ============================================================================

export interface UpdateScheduleCommand {
  scheduleId: string;
  batchId: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  teacherId?: string | null;
}

export class UpdateScheduleUseCase {
  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly batchRepository: BatchRepository,
    private readonly membershipRepository?: InstituteMembershipRepository,
  ) {}

  public async execute(
    context: TenantContext,
    command: UpdateScheduleCommand,
  ): Promise<ScheduleDTO> {
    requireCapability(context, CAPABILITIES.ACADEMIC_WRITE);

    const batch = await this.batchRepository.findById(context.instituteId, command.batchId);
    if (!batch || batch.instituteId !== context.instituteId) {
      throw new NotFoundError(`Batch with ID "${command.batchId}" not found in institute.`);
    }

    const schedule = await this.scheduleRepository.findById(command.batchId, command.scheduleId);
    if (!schedule) {
      throw new NotFoundError(`Schedule record "${command.scheduleId}" not found under batch.`);
    }

    if (command.teacherId && this.membershipRepository) {
      let membership = await this.membershipRepository.findByUserAndInstitute(
        command.teacherId,
        context.instituteId,
      );

      if (!membership) {
        membership = await this.membershipRepository.findById(command.teacherId);
      }

      if (!membership || membership.instituteId !== context.instituteId) {
        throw new NotFoundError(`Teacher with ID "${command.teacherId}" not found in institute.`);
      }

      if (membership.status !== 'active') {
        throw new ValidationError(`Teacher membership "${command.teacherId}" is not active.`);
      }
    }

    schedule.update({
      dayOfWeek: command.dayOfWeek,
      startTime: command.startTime,
      endTime: command.endTime,
      teacherId: command.teacherId,
    });

    const updated = await this.scheduleRepository.update(schedule);
    return toScheduleDTO(updated);
  }
}

// ============================================================================
// 3. DeleteScheduleUseCase
// ============================================================================

export class DeleteScheduleUseCase {
  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly batchRepository: BatchRepository,
  ) {}

  public async execute(context: TenantContext, batchId: string, scheduleId: string): Promise<void> {
    requireCapability(context, CAPABILITIES.ACADEMIC_WRITE);

    const batch = await this.batchRepository.findById(context.instituteId, batchId);
    if (!batch || batch.instituteId !== context.instituteId) {
      throw new NotFoundError(`Batch with ID "${batchId}" not found in institute.`);
    }

    await this.scheduleRepository.delete(batchId, scheduleId);
  }
}

// ============================================================================
// 4. ListSchedulesForBatchUseCase
// ============================================================================

export class ListSchedulesForBatchUseCase {
  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly batchRepository: BatchRepository,
  ) {}

  public async execute(context: TenantContext, batchId: string): Promise<ScheduleDTO[]> {
    requireCapability(context, CAPABILITIES.ACADEMIC_READ);

    const batch = await this.batchRepository.findById(context.instituteId, batchId);
    if (!batch || batch.instituteId !== context.instituteId) {
      throw new NotFoundError(`Batch with ID "${batchId}" not found in institute.`);
    }

    const schedules = await this.scheduleRepository.listByBatch(batchId);
    return schedules.map(toScheduleDTO);
  }
}

// ============================================================================
// 5. GenerateBatchSessionsUseCase
// ============================================================================

export interface GenerateBatchSessionsCommand {
  batchId: string;
  startDate: Date | string;
  endDate: Date | string;
}

export class GenerateBatchSessionsUseCase {
  constructor(
    private readonly batchRepository: BatchRepository,
    private readonly scheduleRepository: ScheduleRepository,
    private readonly batchSessionRepository: BatchSessionRepository,
  ) {}

  public async execute(
    context: TenantContext,
    command: GenerateBatchSessionsCommand,
  ): Promise<BatchSessionDTO[]> {
    requireCapability(context, CAPABILITIES.ACADEMIC_WRITE);

    // 1. Verify batch belongs to context tenant
    const batch = await this.batchRepository.findById(context.instituteId, command.batchId);
    if (!batch || batch.instituteId !== context.instituteId) {
      throw new NotFoundError(`Batch with ID "${command.batchId}" not found in institute.`);
    }

    // 2. Load recurring schedules for batch
    const schedules = await this.scheduleRepository.listByBatch(command.batchId);
    if (schedules.length === 0) {
      return [];
    }

    // 3. Generate candidate session entities via pure domain service
    const candidateSessions = ScheduleGeneratorService.generateCandidateSessions({
      schedules,
      instituteId: context.instituteId,
      batchId: command.batchId,
      startDate: command.startDate,
      endDate: command.endDate,
    });

    // 4. Idempotently save missing sessions via repository transaction
    const savedSessions = await this.batchSessionRepository.createMany(candidateSessions);

    // 5. Sort sessions chronologically by date and startTime
    savedSessions.sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      const timeA = a.startTime ? a.startTime.minutesFromMidnight : 0;
      const timeB = b.startTime ? b.startTime.minutesFromMidnight : 0;
      return timeA - timeB;
    });

    logger.info('academics.session.generated.success', {
      requestId: crypto.randomUUID(),
      instituteId: context.instituteId,
      userId: context.userId,
      batchId: command.batchId,
      sessionCount: savedSessions.length,
    });

    return savedSessions.map(toBatchSessionDTO);
  }
}

// ============================================================================
// 6. CompleteBatchSessionUseCase
// ============================================================================

export class CompleteBatchSessionUseCase {
  constructor(
    private readonly batchSessionRepository: BatchSessionRepository,
  ) {}

  public async execute(context: TenantContext, sessionId: string): Promise<BatchSessionDTO> {
    requireCapability(context, CAPABILITIES.ACADEMIC_WRITE);

    const session = await this.batchSessionRepository.findById(context.instituteId, sessionId);
    if (!session || session.instituteId !== context.instituteId) {
      throw new NotFoundError(`BatchSession record "${sessionId}" not found in institute.`);
    }

    session.complete();
    const updated = await this.batchSessionRepository.update(session);
    return toBatchSessionDTO(updated);
  }
}

// ============================================================================
// 7. CancelBatchSessionUseCase
// ============================================================================

export class CancelBatchSessionUseCase {
  constructor(
    private readonly batchSessionRepository: BatchSessionRepository,
  ) {}

  public async execute(context: TenantContext, sessionId: string): Promise<BatchSessionDTO> {
    requireCapability(context, CAPABILITIES.ACADEMIC_WRITE);

    const session = await this.batchSessionRepository.findById(context.instituteId, sessionId);
    if (!session || session.instituteId !== context.instituteId) {
      throw new NotFoundError(`BatchSession record "${sessionId}" not found in institute.`);
    }

    session.cancel();
    const updated = await this.batchSessionRepository.update(session);

    logger.info('academics.session.cancelled.success', {
      requestId: crypto.randomUUID(),
      instituteId: context.instituteId,
      userId: context.userId,
      sessionId: updated.id,
      batchId: updated.batchId,
    });

    return toBatchSessionDTO(updated);
  }
}

// ============================================================================
// 8. ListBatchSessionsUseCase
// ============================================================================

export interface ListBatchSessionsCommand {
  batchId: string;
  status?: SessionStatus;
  startDate?: Date | string;
  endDate?: Date | string;
  page?: number;
  limit?: number;
}

export class ListBatchSessionsUseCase {
  constructor(
    private readonly batchRepository: BatchRepository,
    private readonly batchSessionRepository: BatchSessionRepository,
  ) {}

  public async execute(
    context: TenantContext,
    command: ListBatchSessionsCommand,
  ): Promise<BatchSessionDTO[]> {
    requireCapability(context, CAPABILITIES.ACADEMIC_READ);

    const batch = await this.batchRepository.findById(context.instituteId, command.batchId);
    if (!batch || batch.instituteId !== context.instituteId) {
      throw new NotFoundError(`Batch with ID "${command.batchId}" not found in institute.`);
    }

    const sessions = await this.batchSessionRepository.listByBatch(
      context.instituteId,
      command.batchId,
      {
        status: command.status,
        startDate: command.startDate,
        endDate: command.endDate,
        page: command.page,
        limit: command.limit,
      },
    );

    return sessions.map(toBatchSessionDTO);
  }
}
