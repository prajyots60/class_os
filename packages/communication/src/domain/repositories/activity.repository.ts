import type { ActivityEntity } from '../entities/activity.entity';
import type { ActivityEventType } from '../types';

export interface ListStudentActivitiesParams {
  instituteId: string;
  studentId: string;
  eventType?: ActivityEventType;
  cursor?: string;
  limit?: number;
}

export interface ActivityRepository {
  /**
   * Appends a new immutable activity record to the timeline.
   */
  save(activity: ActivityEntity): Promise<ActivityEntity>;

  /**
   * Finds an activity record by ID within strict institute + student scope.
   */
  findById(instituteId: string, studentId: string, id: string): Promise<ActivityEntity | null>;

  /**
   * Lists chronological activities for a student with cursor-based pagination.
   */
  findManyForStudent(
    params: ListStudentActivitiesParams,
  ): Promise<{ items: ActivityEntity[]; nextCursor: string | null }>;

  /**
   * Finds an existing activity by idempotency key for domain projection deduplication.
   */
  findBySourceIdempotencyKey(
    instituteId: string,
    studentId: string,
    idempotencyKey: string,
  ): Promise<ActivityEntity | null>;
}
