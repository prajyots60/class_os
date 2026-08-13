import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';

export type AttendanceStatus = 'present' | 'absent' | 'late';

export const VALID_ATTENDANCE_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late'];

export interface AttendanceProps {
  id: string;
  instituteId: string;
  sessionId: string;
  enrollmentId: string;
  status: AttendanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAttendanceProps {
  id?: string;
  instituteId: string;
  sessionId: string;
  enrollmentId: string;
  status: AttendanceStatus;
}

export interface AttendanceDTO {
  id: string;
  instituteId: string;
  sessionId: string;
  enrollmentId: string;
  status: AttendanceStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Attendance Domain Entity
 *
 * Represents an attendance mark recorded for a specific student Enrollment against a concrete BatchSession.
 *
 * INVARIANTS:
 * - ACADEMIC-003: Attendance belongs strictly to (batchSessionId, enrollmentId). Never (studentId, date).
 * - ACADEMIC-004: Attendance references the session, never a raw date or direct Student entity.
 * - ACADEMIC-005: Enrollment must belong to the session's target Batch.
 * - ACADEMIC-006: Tenant-scoped by `instituteId`.
 * - Status must be one of: 'present', 'absent', 'late'.
 */
export class AttendanceEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private readonly _sessionId: string;
  private readonly _enrollmentId: string;
  private _status: AttendanceStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: AttendanceProps) {
    this.validateProps(props);

    this._id = props.id.trim();
    this._instituteId = props.instituteId.trim();
    this._sessionId = props.sessionId.trim();
    this._enrollmentId = props.enrollmentId.trim();
    this._status = props.status;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  private validateProps(props: AttendanceProps): void {
    if (!props.id || typeof props.id !== 'string' || props.id.trim() === '') {
      throw new ValidationError('Attendance ID cannot be empty');
    }

    if (!props.instituteId || typeof props.instituteId !== 'string' || props.instituteId.trim() === '') {
      throw new ValidationError('Institute ID cannot be empty');
    }

    if (!props.sessionId || typeof props.sessionId !== 'string' || props.sessionId.trim() === '') {
      throw new ValidationError('BatchSession ID cannot be empty');
    }

    if (!props.enrollmentId || typeof props.enrollmentId !== 'string' || props.enrollmentId.trim() === '') {
      throw new ValidationError('Enrollment ID cannot be empty');
    }

    if (!VALID_ATTENDANCE_STATUSES.includes(props.status)) {
      throw new ValidationError(
        `Invalid attendance status: "${props.status}". Must be one of: ${VALID_ATTENDANCE_STATUSES.join(', ')}.`,
      );
    }
  }

  public static create(props: CreateAttendanceProps): AttendanceEntity {
    const now = new Date();
    return new AttendanceEntity({
      id: props.id || crypto.randomUUID(),
      instituteId: props.instituteId,
      sessionId: props.sessionId,
      enrollmentId: props.enrollmentId,
      status: props.status,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static from(props: AttendanceProps): AttendanceEntity {
    return new AttendanceEntity(props);
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  public get id(): string {
    return this._id;
  }

  public get instituteId(): string {
    return this._instituteId;
  }

  public get sessionId(): string {
    return this._sessionId;
  }

  public get enrollmentId(): string {
    return this._enrollmentId;
  }

  public get status(): AttendanceStatus {
    return this._status;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  // ── State Mutators ─────────────────────────────────────────────────────────

  public updateStatus(newStatus: AttendanceStatus): void {
    if (!VALID_ATTENDANCE_STATUSES.includes(newStatus)) {
      throw new ValidationError(
        `Invalid attendance status: "${newStatus}". Must be one of: ${VALID_ATTENDANCE_STATUSES.join(', ')}.`,
      );
    }
    this._status = newStatus;
    this._updatedAt = new Date();
  }

  public toDTO(): AttendanceDTO {
    return {
      id: this._id,
      instituteId: this._instituteId,
      sessionId: this._sessionId,
      enrollmentId: this._enrollmentId,
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
