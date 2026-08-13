import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { DayOfWeek, type DayOfWeekValue } from '../value-objects/day-of-week.vo';
import { TimeOfDay } from '../value-objects/time-of-day.vo';

export interface ScheduleProps {
  id: string;
  batchId: string;
  dayOfWeek: DayOfWeek | DayOfWeekValue | string;
  startTime: TimeOfDay | string;
  endTime: TimeOfDay | string;
  teacherId?: string | null;
  createdAt: Date;
}

export interface CreateScheduleProps {
  id?: string;
  batchId: string;
  dayOfWeek: DayOfWeek | DayOfWeekValue | string;
  startTime: TimeOfDay | string;
  endTime: TimeOfDay | string;
  teacherId?: string | null;
}

export interface ScheduleDTO {
  id: string;
  batchId: string;
  dayOfWeek: DayOfWeekValue;
  startTime: string;
  endTime: string;
  teacherId: string | null;
  createdAt: string;
}

/**
 * Schedule Domain Entity
 *
 * Represents a recurring weekly blueprint rule for a Batch.
 *
 * INVARIANTS:
 * - SCHEDULE-001: Represents a recurring weekly blueprint.
 * - SCHEDULE-002: Belongs to exactly one Batch (`batchId`).
 * - SCHEDULE-005: `dayOfWeek` must be a valid weekday.
 * - SCHEDULE-006: `startTime < endTime`.
 * - SCHEDULE-007: Schedule modifications do not rewrite historical BatchSessions.
 */
export class ScheduleEntity {
  private readonly _id: string;
  private readonly _batchId: string;
  private _dayOfWeek: DayOfWeek;
  private _startTime: TimeOfDay;
  private _endTime: TimeOfDay;
  private _teacherId: string | null;
  private readonly _createdAt: Date;

  private constructor(props: ScheduleProps) {
    if (!props.id || typeof props.id !== 'string' || props.id.trim() === '') {
      throw new ValidationError('Schedule ID cannot be empty');
    }

    if (!props.batchId || typeof props.batchId !== 'string' || props.batchId.trim() === '') {
      throw new ValidationError('Batch ID cannot be empty');
    }

    const dayOfWeek = props.dayOfWeek instanceof DayOfWeek
      ? props.dayOfWeek
      : DayOfWeek.create(props.dayOfWeek);

    const startTime = props.startTime instanceof TimeOfDay
      ? props.startTime
      : TimeOfDay.create(props.startTime);

    const endTime = props.endTime instanceof TimeOfDay
      ? props.endTime
      : TimeOfDay.create(props.endTime);

    if (!startTime.isBefore(endTime)) {
      throw new ValidationError(
        `Invalid schedule times: startTime (${startTime.value}) must be strictly before endTime (${endTime.value}).`,
      );
    }

    this._id = props.id.trim();
    this._batchId = props.batchId.trim();
    this._dayOfWeek = dayOfWeek;
    this._startTime = startTime;
    this._endTime = endTime;
    this._teacherId = props.teacherId ? props.teacherId.trim() || null : null;
    this._createdAt = props.createdAt || new Date();
  }

  public static create(props: CreateScheduleProps): ScheduleEntity {
    return new ScheduleEntity({
      id: props.id || crypto.randomUUID(),
      batchId: props.batchId,
      dayOfWeek: props.dayOfWeek,
      startTime: props.startTime,
      endTime: props.endTime,
      teacherId: props.teacherId,
      createdAt: new Date(),
    });
  }

  public static from(props: ScheduleProps): ScheduleEntity {
    return new ScheduleEntity(props);
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  public get id(): string {
    return this._id;
  }

  public get batchId(): string {
    return this._batchId;
  }

  public get dayOfWeek(): DayOfWeek {
    return this._dayOfWeek;
  }

  public get startTime(): TimeOfDay {
    return this._startTime;
  }

  public get endTime(): TimeOfDay {
    return this._endTime;
  }

  public get teacherId(): string | null {
    return this._teacherId;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  // ── State Mutators ─────────────────────────────────────────────────────────

  public update(props: {
    dayOfWeek?: DayOfWeek | DayOfWeekValue | string;
    startTime?: TimeOfDay | string;
    endTime?: TimeOfDay | string;
    teacherId?: string | null;
  }): void {
    const newDay = props.dayOfWeek !== undefined
      ? (props.dayOfWeek instanceof DayOfWeek ? props.dayOfWeek : DayOfWeek.create(props.dayOfWeek))
      : this._dayOfWeek;

    const newStart = props.startTime !== undefined
      ? (props.startTime instanceof TimeOfDay ? props.startTime : TimeOfDay.create(props.startTime))
      : this._startTime;

    const newEnd = props.endTime !== undefined
      ? (props.endTime instanceof TimeOfDay ? props.endTime : TimeOfDay.create(props.endTime))
      : this._endTime;

    if (!newStart.isBefore(newEnd)) {
      throw new ValidationError(
        `Invalid schedule times: startTime (${newStart.value}) must be strictly before endTime (${newEnd.value}).`,
      );
    }

    this._dayOfWeek = newDay;
    this._startTime = newStart;
    this._endTime = newEnd;

    if (props.teacherId !== undefined) {
      this._teacherId = props.teacherId ? props.teacherId.trim() || null : null;
    }
  }

  public assignTeacher(teacherId: string | null): void {
    this._teacherId = teacherId ? teacherId.trim() || null : null;
  }

  public toDTO(): ScheduleDTO {
    return {
      id: this._id,
      batchId: this._batchId,
      dayOfWeek: this._dayOfWeek.value,
      startTime: this._startTime.value,
      endTime: this._endTime.value,
      teacherId: this._teacherId,
      createdAt: this._createdAt.toISOString(),
    };
  }
}
