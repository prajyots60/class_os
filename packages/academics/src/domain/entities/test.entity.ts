import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';

export type TestStatus = 'draft' | 'scheduled' | 'marks_entered' | 'published';

export interface TestProps {
  id: string;
  instituteId: string;
  batchId: string;
  title: string;
  maximumMarks: number;
  scheduledDate?: Date | null;
  status?: TestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTestProps {
  id?: string;
  instituteId: string;
  batchId: string;
  title: string;
  maximumMarks: number;
  scheduledDate?: Date | string | null;
}

export interface TestDTO {
  id: string;
  instituteId: string;
  batchId: string;
  title: string;
  maximumMarks: number;
  scheduledDate: string | null;
  status: TestStatus;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Test / Assessment Domain Entity
 *
 * Represents an academic assessment targeted at a single Batch.
 *
 * INVARIANTS:
 * - ACADEMIC-006: Tenant-scoped by `instituteId`.
 * - ACADEMIC-010: maximumMarks must be a positive integer (> 0).
 * - State Machine: draft -> scheduled -> marks_entered -> published.
 * - Publication Immutability: Once `status === 'published'`, title, maximumMarks, and scheduledDate cannot be mutated. Reverting to draft/scheduled is forbidden.
 */
export class TestEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private readonly _batchId: string;
  private _title: string;
  private _maximumMarks: number;
  private _scheduledDate: Date | null;
  private _status: TestStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: TestProps) {
    this.validateId(props.id, 'Test ID');
    this.validateId(props.instituteId, 'Institute ID');
    this.validateId(props.batchId, 'Batch ID');
    const validatedTitle = this.validateTitle(props.title);
    const validatedMaxMarks = this.validateMaximumMarks(props.maximumMarks);
    const validatedDate = this.validateScheduledDate(props.scheduledDate);

    this._id = props.id.trim();
    this._instituteId = props.instituteId.trim();
    this._batchId = props.batchId.trim();
    this._title = validatedTitle;
    this._maximumMarks = validatedMaxMarks;
    this._scheduledDate = validatedDate;
    this._status = props.status || 'draft';
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  private validateId(val: string, name: string): void {
    if (!val || typeof val !== 'string' || val.trim() === '') {
      throw new ValidationError(`${name} cannot be empty`);
    }
  }

  private validateTitle(val: string): string {
    if (!val || typeof val !== 'string' || val.trim() === '') {
      throw new ValidationError('Test title cannot be empty');
    }
    const trimmed = val.trim();
    if (trimmed.length > 255) {
      throw new ValidationError('Test title cannot exceed 255 characters');
    }
    return trimmed;
  }

  private validateMaximumMarks(val: number): number {
    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
      throw new ValidationError('Maximum marks must be a valid number');
    }
    if (!Number.isInteger(val) || val <= 0) {
      throw new ValidationError('Maximum marks must be a positive integer greater than zero');
    }
    return val;
  }

  private validateScheduledDate(val?: Date | string | null): Date | null {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      throw new ValidationError('Scheduled date must be a valid date');
    }
    return d;
  }

  public static create(props: CreateTestProps): TestEntity {
    const now = new Date();
    let scheduledDate: Date | null = null;
    if (props.scheduledDate) {
      const d = new Date(props.scheduledDate);
      if (isNaN(d.getTime())) {
        throw new ValidationError('Scheduled date must be a valid date');
      }
      scheduledDate = d;
    }

    return new TestEntity({
      id: props.id || crypto.randomUUID(),
      instituteId: props.instituteId,
      batchId: props.batchId,
      title: props.title,
      maximumMarks: props.maximumMarks,
      scheduledDate,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    });
  }

  public static from(props: TestProps): TestEntity {
    return new TestEntity(props);
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

  public get title(): string {
    return this._title;
  }

  public get maximumMarks(): number {
    return this._maximumMarks;
  }

  public get scheduledDate(): Date | null {
    return this._scheduledDate ? new Date(this._scheduledDate.getTime()) : null;
  }

  public get status(): TestStatus {
    return this._status;
  }

  public get isPublished(): boolean {
    return this._status === 'published';
  }

  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  // ── State Mutators ─────────────────────────────────────────────────────────

  public schedule(scheduledDate?: Date | string): void {
    if (this._status === 'published') {
      throw new ValidationError('Cannot reschedule a published test');
    }
    if (this._status === 'marks_entered') {
      throw new ValidationError('Cannot reschedule a test after marks have been entered');
    }

    if (scheduledDate) {
      this._scheduledDate = this.validateScheduledDate(scheduledDate);
    }
    this._status = 'scheduled';
    this._updatedAt = new Date();
  }

  public updateDetails(props: {
    title?: string;
    maximumMarks?: number;
    scheduledDate?: Date | string | null;
  }): void {
    if (this._status === 'published') {
      throw new ValidationError('Cannot update details of a published test. Published tests are immutable.');
    }

    if (props.title !== undefined) {
      this._title = this.validateTitle(props.title);
    }

    if (props.maximumMarks !== undefined) {
      this._maximumMarks = this.validateMaximumMarks(props.maximumMarks);
    }

    if (props.scheduledDate !== undefined) {
      this._scheduledDate = this.validateScheduledDate(props.scheduledDate);
    }

    this._updatedAt = new Date();
  }

  public markMarksEntered(): void {
    if (this._status === 'published') {
      throw new ValidationError('Cannot enter marks for an already published test');
    }

    this._status = 'marks_entered';
    this._updatedAt = new Date();
  }

  public publishResults(): void {
    if (this._status === 'published') {
      return; // Idempotent publication
    }

    if (this._status === 'draft') {
      throw new ValidationError('Cannot publish test results from draft state. Marks must be entered first.');
    }

    this._status = 'published';
    this._updatedAt = new Date();
  }

  public toDTO(): TestDTO {
    return {
      id: this._id,
      instituteId: this._instituteId,
      batchId: this._batchId,
      title: this._title,
      maximumMarks: this._maximumMarks,
      scheduledDate: this._scheduledDate ? this._scheduledDate.toISOString() : null,
      status: this._status,
      isPublished: this.isPublished,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
