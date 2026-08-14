import { ValidationError } from '@coaching-os/shared';
import type { ActivityEventType } from '../types';

export interface ActivityProps {
  id: string;
  instituteId: string;
  studentId: string;
  eventType: ActivityEventType;
  title: string;
  description: string;
  occurredAt: Date;
  actorName?: string | null;
  metadata?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
  createdAt: Date;
}

const VALID_EVENT_TYPES: ReadonlySet<ActivityEventType> = new Set([
  'attendance_absent',
  'attendance_present',
  'homework_assigned',
  'test_result',
  'fee_payment',
  'receipt_issued',
  'announcement',
]);

/**
 * ActivityEntity — Framework-independent Domain Aggregate Root for Child Activity Timeline
 * IMMUTABLE LEDGER ENTRY. Once created, no mutations (no update/delete/archive) are permitted.
 */
export class ActivityEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private readonly _studentId: string;
  private readonly _eventType: ActivityEventType;
  private readonly _title: string;
  private readonly _description: string;
  private readonly _occurredAt: Date;
  private readonly _actorName: string | null;
  private readonly _metadata: Record<string, unknown> | null;
  private readonly _idempotencyKey: string | null;
  private readonly _createdAt: Date;

  private constructor(props: ActivityProps) {
    this._id = props.id;
    this._instituteId = props.instituteId;
    this._studentId = props.studentId;
    this._eventType = props.eventType;
    this._title = props.title;
    this._description = props.description;
    this._occurredAt = new Date(props.occurredAt.getTime());
    this._actorName = props.actorName ?? null;
    this._metadata = props.metadata ? JSON.parse(JSON.stringify(props.metadata)) : null;
    this._idempotencyKey = props.idempotencyKey ?? null;
    this._createdAt = new Date(props.createdAt.getTime());

    this.validate();
  }

  public static create(props: ActivityProps): ActivityEntity {
    return new ActivityEntity(props);
  }

  public static rehydrate(props: ActivityProps): ActivityEntity {
    return new ActivityEntity(props);
  }

  private validate(): void {
    if (!this._id || typeof this._id !== 'string' || this._id.trim().length === 0) {
      throw new ValidationError('Activity ID must be a non-empty string');
    }
    if (!this._instituteId || typeof this._instituteId !== 'string' || this._instituteId.trim().length === 0) {
      throw new ValidationError('Institute ID must be a non-empty string');
    }
    if (!this._studentId || typeof this._studentId !== 'string' || this._studentId.trim().length === 0) {
      throw new ValidationError('Student ID must be a non-empty string');
    }
    if (!VALID_EVENT_TYPES.has(this._eventType)) {
      throw new ValidationError(`Invalid activity event type: '${this._eventType}'`);
    }
    if (!this._title || typeof this._title !== 'string' || this._title.trim().length === 0) {
      throw new ValidationError('Activity title cannot be empty');
    }
    if (this._title.length > 255) {
      throw new ValidationError('Activity title cannot exceed 255 characters');
    }
    if (!this._description || typeof this._description !== 'string' || this._description.trim().length === 0) {
      throw new ValidationError('Activity description cannot be empty');
    }
    if (isNaN(this._occurredAt.getTime())) {
      throw new ValidationError('Activity occurredAt date is invalid');
    }
    if (isNaN(this._createdAt.getTime())) {
      throw new ValidationError('Activity createdAt date is invalid');
    }
  }

  // Getters return defensive copies to guarantee 100% immutability
  public get id(): string {
    return this._id;
  }

  public get instituteId(): string {
    return this._instituteId;
  }

  public get studentId(): string {
    return this._studentId;
  }

  public get eventType(): ActivityEventType {
    return this._eventType;
  }

  public get title(): string {
    return this._title;
  }

  public get description(): string {
    return this._description;
  }

  public get occurredAt(): Date {
    return new Date(this._occurredAt.getTime());
  }

  public get actorName(): string | null {
    return this._actorName;
  }

  public get metadata(): Record<string, unknown> | null {
    return this._metadata ? JSON.parse(JSON.stringify(this._metadata)) : null;
  }

  public get idempotencyKey(): string | null {
    return this._idempotencyKey;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      instituteId: this._instituteId,
      studentId: this._studentId,
      eventType: this._eventType,
      title: this._title,
      description: this._description,
      occurredAt: this._occurredAt.toISOString(),
      actorName: this._actorName,
      metadata: this.metadata,
      idempotencyKey: this._idempotencyKey,
      createdAt: this._createdAt.toISOString(),
    };
  }
}
