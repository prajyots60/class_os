import { createHash } from 'crypto';
import { AuthorizationError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { ActivityEntity } from '../../domain/entities/activity.entity';
import type { ActivityRepository } from '../../domain/repositories/activity.repository';
import type { ActivityEventType } from '../../domain/types';
import { toActivityDTO, type ActivityDTO } from '../dto/activity.dto';

function generateDeterministicUUID(namespace: string, key: string): string {
  const hash = createHash('sha256').update(`${namespace}:${key}`).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    (parseInt(hash.substring(16, 17), 16) & 0x3 | 0x8).toString(16) + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join('-');
}

export interface GetActivityRequest {
  instituteId: string;
  studentId: string;
  activityId: string;
  userCapabilities: ReadonlySet<string>;
}

export class GetActivityUseCase {
  constructor(private readonly activityRepository: ActivityRepository) {}

  public async execute(request: GetActivityRequest): Promise<ActivityDTO> {
    if (!request.userCapabilities.has('activity:read')) {
      throw new AuthorizationError('Required capability missing: activity:read');
    }

    const activity = await this.activityRepository.findById(
      request.instituteId,
      request.studentId,
      request.activityId,
    );

    if (!activity) {
      throw new NotFoundError('Activity record not found');
    }

    return toActivityDTO(activity);
  }
}

export interface ListStudentActivitiesRequest {
  instituteId: string;
  studentId: string;
  eventType?: ActivityEventType;
  cursor?: string;
  limit?: number;
  userCapabilities: ReadonlySet<string>;
}

export interface ListStudentActivitiesResponse {
  items: ActivityDTO[];
  nextCursor: string | null;
}

export class ListStudentActivitiesUseCase {
  constructor(private readonly activityRepository: ActivityRepository) {}

  public async execute(request: ListStudentActivitiesRequest): Promise<ListStudentActivitiesResponse> {
    if (!request.userCapabilities.has('activity:read')) {
      throw new AuthorizationError('Required capability missing: activity:read');
    }

    const result = await this.activityRepository.findManyForStudent({
      instituteId: request.instituteId,
      studentId: request.studentId,
      eventType: request.eventType,
      cursor: request.cursor,
      limit: request.limit,
    });

    return {
      items: result.items.map(toActivityDTO),
      nextCursor: result.nextCursor,
    };
  }
}

export interface ProjectActivityInput {
  instituteId: string;
  studentId: string;
  eventType: ActivityEventType;
  title: string;
  description: string;
  occurredAt: Date;
  actorName?: string | null;
  metadata?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
}

export class ProjectActivityUseCase {
  constructor(private readonly activityRepository: ActivityRepository) {}

  public async execute(input: ProjectActivityInput): Promise<ActivityDTO> {
    if (!input.instituteId || !input.studentId) {
      throw new ValidationError('Institute ID and Student ID are required for activity projection');
    }

    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const existing = await this.activityRepository.findBySourceIdempotencyKey(
        input.instituteId,
        input.studentId,
        input.idempotencyKey,
      );
      if (existing) {
        return toActivityDTO(existing);
      }
    }

    // 2. Deterministic ID generation if idempotency key present
    const id = input.idempotencyKey
      ? generateDeterministicUUID(`${input.instituteId}:${input.studentId}`, input.idempotencyKey)
      : crypto.randomUUID();

    const entity = ActivityEntity.create({
      id,
      instituteId: input.instituteId,
      studentId: input.studentId,
      eventType: input.eventType,
      title: input.title,
      description: input.description,
      occurredAt: input.occurredAt,
      actorName: input.actorName,
      metadata: input.metadata,
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date(),
    });

    try {
      const saved = await this.activityRepository.save(entity);
      return toActivityDTO(saved);
    } catch (error) {
      // Re-query in case of concurrent projection race condition
      if (input.idempotencyKey) {
        const existing = await this.activityRepository.findBySourceIdempotencyKey(
          input.instituteId,
          input.studentId,
          input.idempotencyKey,
        );
        if (existing) {
          return toActivityDTO(existing);
        }
      }
      throw error;
    }
  }
}

export class ActivityProjectionService {
  constructor(private readonly projectActivityUseCase: ProjectActivityUseCase) {}

  public async projectAttendanceRecorded(params: {
    instituteId: string;
    studentId: string;
    status: 'absent' | 'present';
    sessionTitle: string;
    recordedBy: string;
    occurredAt: Date;
    eventIdempotencyKey: string;
  }): Promise<ActivityDTO> {
    const eventType: ActivityEventType =
      params.status === 'absent' ? 'attendance_absent' : 'attendance_present';
    const title = params.status === 'absent' ? 'Marked Absent' : 'Marked Present';
    const description = `Student was marked ${params.status} for session '${params.sessionTitle}' by ${params.recordedBy}`;

    return this.projectActivityUseCase.execute({
      instituteId: params.instituteId,
      studentId: params.studentId,
      eventType,
      title,
      description,
      occurredAt: params.occurredAt,
      actorName: params.recordedBy,
      metadata: { sessionTitle: params.sessionTitle, status: params.status },
      idempotencyKey: params.eventIdempotencyKey,
    });
  }

  public async projectHomeworkPublished(params: {
    instituteId: string;
    studentId: string;
    homeworkTitle: string;
    subjectName: string;
    assignedBy: string;
    dueDate?: string | null;
    occurredAt: Date;
    eventIdempotencyKey: string;
  }): Promise<ActivityDTO> {
    return this.projectActivityUseCase.execute({
      instituteId: params.instituteId,
      studentId: params.studentId,
      eventType: 'homework_assigned',
      title: `Homework Assigned: ${params.homeworkTitle}`,
      description: `New homework assigned for ${params.subjectName} by ${params.assignedBy}`,
      occurredAt: params.occurredAt,
      actorName: params.assignedBy,
      metadata: { homeworkTitle: params.homeworkTitle, subjectName: params.subjectName, dueDate: params.dueDate },
      idempotencyKey: params.eventIdempotencyKey,
    });
  }

  public async projectTestResultPublished(params: {
    instituteId: string;
    studentId: string;
    testTitle: string;
    marksObtained: number;
    totalMarks: number;
    publishedBy: string;
    occurredAt: Date;
    eventIdempotencyKey: string;
  }): Promise<ActivityDTO> {
    return this.projectActivityUseCase.execute({
      instituteId: params.instituteId,
      studentId: params.studentId,
      eventType: 'test_result',
      title: `Test Result: ${params.testTitle}`,
      description: `Scored ${params.marksObtained}/${params.totalMarks} in ${params.testTitle}`,
      occurredAt: params.occurredAt,
      actorName: params.publishedBy,
      metadata: { testTitle: params.testTitle, marksObtained: params.marksObtained, totalMarks: params.totalMarks },
      idempotencyKey: params.eventIdempotencyKey,
    });
  }

  public async projectPaymentRecorded(params: {
    instituteId: string;
    studentId: string;
    amount: number;
    paymentMode: string;
    recordedBy: string;
    occurredAt: Date;
    eventIdempotencyKey: string;
  }): Promise<ActivityDTO> {
    return this.projectActivityUseCase.execute({
      instituteId: params.instituteId,
      studentId: params.studentId,
      eventType: 'fee_payment',
      title: `Fee Payment Recorded: ₹${params.amount}`,
      description: `Payment of ₹${params.amount} received via ${params.paymentMode}`,
      occurredAt: params.occurredAt,
      actorName: params.recordedBy,
      metadata: { amount: params.amount, paymentMode: params.paymentMode },
      idempotencyKey: params.eventIdempotencyKey,
    });
  }

  public async projectReceiptGenerated(params: {
    instituteId: string;
    studentId: string;
    receiptNumber: string;
    amount: number;
    occurredAt: Date;
    eventIdempotencyKey: string;
  }): Promise<ActivityDTO> {
    return this.projectActivityUseCase.execute({
      instituteId: params.instituteId,
      studentId: params.studentId,
      eventType: 'receipt_issued',
      title: `Receipt Issued: ${params.receiptNumber}`,
      description: `Official receipt ${params.receiptNumber} issued for ₹${params.amount}`,
      occurredAt: params.occurredAt,
      actorName: 'System',
      metadata: { receiptNumber: params.receiptNumber, amount: params.amount },
      idempotencyKey: params.eventIdempotencyKey,
    });
  }

  public async projectAnnouncementPublished(params: {
    instituteId: string;
    studentId: string;
    announcementTitle: string;
    authorName: string;
    occurredAt: Date;
    eventIdempotencyKey: string;
  }): Promise<ActivityDTO> {
    return this.projectActivityUseCase.execute({
      instituteId: params.instituteId,
      studentId: params.studentId,
      eventType: 'announcement',
      title: `Announcement: ${params.announcementTitle}`,
      description: `Announcement published by ${params.authorName}`,
      occurredAt: params.occurredAt,
      actorName: params.authorName,
      metadata: { announcementTitle: params.announcementTitle },
      idempotencyKey: params.eventIdempotencyKey,
    });
  }
}
