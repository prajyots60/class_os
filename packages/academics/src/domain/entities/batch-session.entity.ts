import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { TimeOfDay } from '../value-objects/time-of-day.vo';

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';
export type AttendanceSource = 'manual' | 'rfid';

export interface BatchSessionProps {
  id: string;
  instituteId: string;
  batchId: string;
  date: Date | string;
  startTime?: TimeOfDay | string | null;
  endTime?: TimeOfDay | string | null;
  status: SessionStatus;
  attendanceTaken?: boolean;
  source?: AttendanceSource | null;
  substituteTeacherId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBatchSessionProps {
  id?: string;
  instituteId: string;
  batchId: string;
  date: Date | string;
  startTime?: TimeOfDay | string | null;
  endTime?: TimeOfDay | string | null;
  status?: SessionStatus;
  attendanceTaken?: boolean;
  source?: AttendanceSource | null;
  substituteTeacherId?: string | null;
}

export interface BatchSessionDTO {
  id: string;
  instituteId: string;
  batchId: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  status: SessionStatus;
  attendanceTaken: boolean;
  source: AttendanceSource | null;
  substituteTeacherId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * BatchSession Domain Entity
 *
 * Represents a concrete calendar occurrence of a class session.
 *
 * INVARIANTS:
 * - SESSION-001: Belongs to exactly one Batch (`batchId`).
 * - SESSION-002: Batch and session belong to the same tenant (`instituteId`).
 * - SESSION-003: Session date is mandatory.
 * - SESSION-004: Session status is one of: `scheduled`, `completed`, `cancelled`.
 * - SESSION-005: Cancelled sessions cannot be treated as active sessions or receive attendance.
 * - SESSION-006: Historical sessions remain immutable with respect to schedule changes.
 * - SESSION-007: Session generation must be idempotent.
 */
export class BatchSessionEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private readonly _batchId: string;
  private readonly _date: Date;
  private _startTime: TimeOfDay | null;
  private _endTime: TimeOfDay | null;
  private _status: SessionStatus;
  private _attendanceTaken: boolean;
  private _source: AttendanceSource | null;
  private _substituteTeacherId: string | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: BatchSessionProps) {
    if (!props.id || typeof props.id !== 'string' || props.id.trim() === '') {
      throw new ValidationError('Session ID cannot be empty');
    }

    if (!props.instituteId || typeof props.instituteId !== 'string' || props.instituteId.trim() === '') {
      throw new ValidationError('Institute ID cannot be empty');
    }

    if (!props.batchId || typeof props.batchId !== 'string' || props.batchId.trim() === '') {
      throw new ValidationError('Batch ID cannot be empty');
    }

    const validatedDate = BatchSessionEntity.validateDate(props.date);
    const validatedStatus = BatchSessionEntity.validateStatus(props.status);

    let startTime: TimeOfDay | null = null;
    let endTime: TimeOfDay | null = null;

    if (props.startTime) {
      startTime = props.startTime instanceof TimeOfDay ? props.startTime : TimeOfDay.create(props.startTime);
    }

    if (props.endTime) {
      endTime = props.endTime instanceof TimeOfDay ? props.endTime : TimeOfDay.create(props.endTime);
    }

    if (startTime && endTime && !startTime.isBefore(endTime)) {
      throw new ValidationError(
        `Invalid session times: startTime (${startTime.value}) must be strictly before endTime (${endTime.value}).`,
      );
    }

    this._id = props.id.trim();
    this._instituteId = props.instituteId.trim();
    this._batchId = props.batchId.trim();
    this._date = validatedDate;
    this._startTime = startTime;
    this._endTime = endTime;
    this._status = validatedStatus;
    this._attendanceTaken = Boolean(props.attendanceTaken);
    this._source = props.source || null;
    this._substituteTeacherId = props.substituteTeacherId ? props.substituteTeacherId.trim() || null : null;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  public static create(props: CreateBatchSessionProps): BatchSessionEntity {
    const now = new Date();
    return new BatchSessionEntity({
      id: props.id || crypto.randomUUID(),
      instituteId: props.instituteId,
      batchId: props.batchId,
      date: props.date,
      startTime: props.startTime,
      endTime: props.endTime,
      status: props.status || 'scheduled',
      attendanceTaken: props.attendanceTaken || false,
      source: props.source || null,
      substituteTeacherId: props.substituteTeacherId || null,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static from(props: BatchSessionProps): BatchSessionEntity {
    return new BatchSessionEntity(props);
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  public get id(): string {
    return this._id;
  }

  public get instituteId(): string {
    return this._instituteId;
  }

  public get batchId(): string {
    return this._batchId;
  }

  public get date(): Date {
    return new Date(this._date.getTime());
  }

  public get startTime(): TimeOfDay | null {
    return this._startTime;
  }

  public get endTime(): TimeOfDay | null {
    return this._endTime;
  }

  public get status(): SessionStatus {
    return this._status;
  }

  public get attendanceTaken(): boolean {
    return this._attendanceTaken;
  }

  public get source(): AttendanceSource | null {
    return this._source;
  }

  public get substituteTeacherId(): string | null {
    return this._substituteTeacherId;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  // ── State Transitions ──────────────────────────────────────────────────────

  /**
   * Complete the session (scheduled → completed).
   */
  public complete(): void {
    if (this._status === 'completed') return;

    if (this._status === 'cancelled') {
      throw new ValidationError('Cannot mark a cancelled session as completed');
    }

    this._status = 'completed';
    this._updatedAt = new Date();
  }

  /**
   * Cancel the session (scheduled → cancelled).
   */
  public cancel(): void {
    if (this._status === 'cancelled') return;

    if (this._status === 'completed') {
      throw new ValidationError('Cannot cancel an already completed session');
    }

    this._status = 'cancelled';
    this._updatedAt = new Date();
  }

  public assignSubstituteTeacher(teacherId: string | null): void {
    if (this._status === 'cancelled') {
      throw new ValidationError('Cannot assign substitute teacher to a cancelled session');
    }

    const val = teacherId ? teacherId.trim() || null : null;
    if (this._substituteTeacherId !== val) {
      this._substituteTeacherId = val;
      this._updatedAt = new Date();
    }
  }

  public markAttendanceTaken(source: AttendanceSource = 'manual'): void {
    if (this._status === 'cancelled') {
      throw new ValidationError('Cannot record attendance for a cancelled session');
    }

    this._attendanceTaken = true;
    this._source = source;
    this._updatedAt = new Date();
  }

  public toDTO(): BatchSessionDTO {
    return {
      id: this._id,
      instituteId: this._instituteId,
      batchId: this._batchId,
      date: BatchSessionEntity.formatDateToIsoString(this._date),
      startTime: this._startTime ? this._startTime.value : null,
      endTime: this._endTime ? this._endTime.value : null,
      status: this._status,
      attendanceTaken: this._attendanceTaken,
      source: this._source,
      substituteTeacherId: this._substituteTeacherId,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private static validateDate(date: Date | string): Date {
    if (!date) {
      throw new ValidationError('Session date cannot be empty');
    }

    let parsedDate: Date;
    if (typeof date === 'string') {
      // Expect YYYY-MM-DD or ISO string
      parsedDate = new Date(date);
    } else {
      parsedDate = date;
    }

    if (Number.isNaN(parsedDate.getTime())) {
      throw new ValidationError(`Invalid session date: "${date}"`);
    }

    // Normalize date to UTC midnight (YYYY-MM-DD)
    const normalized = new Date(
      Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate()),
    );

    return normalized;
  }

  private static validateStatus(status: string): SessionStatus {
    const validStatuses: SessionStatus[] = ['scheduled', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status as SessionStatus)) {
      throw new ValidationError(`Invalid session status: "${status}". Must be scheduled, completed, or cancelled.`);
    }
    return status as SessionStatus;
  }

  private static formatDateToIsoString(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
