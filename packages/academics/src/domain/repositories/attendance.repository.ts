import type { AttendanceEntity } from '../entities/attendance.entity';

/**
 * AttendanceRepository Interface
 *
 * Domain repository abstraction for tenant-scoped Attendance persistence.
 *
 * ARCHITECTURAL CONTRACT:
 * - Framework-independent, zero Prisma or HTTP dependencies.
 * - Operates strictly on `AttendanceEntity` domain entities.
 * - EVERY query method requires `instituteId` as an explicit parameter to enforce
 *   strict multi-tenant isolation at the persistence boundary.
 * - Atomic bulk persistence: `upsertMany` upserts attendance records AND marks
 *   `BatchSession.attendanceTaken = true` in a single atomic database transaction.
 */
export interface AttendanceRepository {
  /**
   * Find all attendance records for a specific BatchSession within tenant context.
   */
  findBySessionId(instituteId: string, sessionId: string): Promise<AttendanceEntity[]>;

  /**
   * Find attendance record for a specific (sessionId, enrollmentId) pair within tenant context.
   */
  findBySessionAndEnrollment(
    instituteId: string,
    sessionId: string,
    enrollmentId: string,
  ): Promise<AttendanceEntity | null>;

  /**
   * Atomically upserts bulk attendance records AND sets `BatchSession.attendanceTaken = true`
   * inside a single database transaction.
   *
   * Enforces:
   * - ATTENDANCE-001 (Atomicity): All or nothing persistence.
   * - ATTENDANCE-002 (Idempotency): Upserts existing (sessionId, enrollmentId) records without duplicate creation.
   */
  upsertMany(
    instituteId: string,
    sessionId: string,
    records: AttendanceEntity[],
  ): Promise<AttendanceEntity[]>;
}
