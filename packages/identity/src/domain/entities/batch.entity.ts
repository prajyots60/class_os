import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { BatchCode } from '../value-objects/batch-code.vo';

export type BatchStatus = 'draft' | 'open' | 'running' | 'completed' | 'archived';

export interface BatchProps {
  id: string;
  instituteId: string;
  subjectId: string;
  programId?: string | null;
  teacherId?: string | null;
  name: string;
  code: BatchCode | string;
  capacity?: number | null;
  status: BatchStatus;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateBatchProps {
  id?: string;
  instituteId: string;
  subjectId: string;
  programId?: string | null;
  teacherId?: string | null;
  name: string;
  code: BatchCode | string;
  capacity?: number | null;
  status?: BatchStatus;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}

export interface BatchDTO {
  id: string;
  instituteId: string;
  subjectId: string;
  programId: string | null;
  teacherId: string | null;
  name: string;
  code: string;
  capacity: number | null;
  status: BatchStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Batch Domain Entity
 *
 * Represents an operational teaching group within an institute tenant.
 *
 * ARCHITECTURAL INVARIANTS:
 * - Belongs to an Institute (`instituteId`).
 * - Must belong to a Subject (`subjectId`).
 * - Optionally references a Program (`programId`).
 * - Lean primary teacher reference (`teacherId`).
 * - STRICTLY NO Student / Enrollment relations (Phase 1.11 boundary).
 */
export class BatchEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private readonly _subjectId: string;
  private _programId: string | null;
  private _teacherId: string | null;
  private _name: string;
  private readonly _code: BatchCode;
  private _capacity: number | null;
  private _status: BatchStatus;
  private _startDate: Date | null;
  private _endDate: Date | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt: Date | null;

  private constructor(props: BatchProps) {
    if (!props.id || typeof props.id !== 'string' || props.id.trim() === '') {
      throw new ValidationError('Batch ID cannot be empty');
    }

    if (!props.instituteId || typeof props.instituteId !== 'string' || props.instituteId.trim() === '') {
      throw new ValidationError('Institute ID cannot be empty');
    }

    if (!props.subjectId || typeof props.subjectId !== 'string' || props.subjectId.trim() === '') {
      throw new ValidationError('Subject ID cannot be empty');
    }

    const normalizedName = BatchEntity.validateName(props.name);
    const validatedCode = BatchCode.create(props.code);
    const validatedStatus = BatchEntity.validateStatus(props.status);
    const validatedCapacity = props.capacity !== undefined && props.capacity !== null
      ? BatchEntity.validateCapacity(props.capacity)
      : null;

    const { startDate, endDate } = BatchEntity.validateDates(props.startDate, props.endDate);

    this._id = props.id.trim();
    this._instituteId = props.instituteId.trim();
    this._subjectId = props.subjectId.trim();
    this._programId = props.programId ? props.programId.trim() || null : null;
    this._teacherId = props.teacherId ? props.teacherId.trim() || null : null;
    this._name = normalizedName;
    this._code = validatedCode;
    this._capacity = validatedCapacity;
    this._status = validatedStatus;
    this._startDate = startDate;
    this._endDate = endDate;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._deletedAt = props.deletedAt || null;
  }

  public static create(props: CreateBatchProps): BatchEntity {
    const now = new Date();
    return new BatchEntity({
      id: props.id || crypto.randomUUID(),
      instituteId: props.instituteId,
      subjectId: props.subjectId,
      programId: props.programId,
      teacherId: props.teacherId,
      name: props.name,
      code: props.code,
      capacity: props.capacity,
      status: props.status || 'draft',
      startDate: props.startDate,
      endDate: props.endDate,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static from(props: BatchProps): BatchEntity {
    return new BatchEntity(props);
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  public get id(): string {
    return this._id;
  }

  public get instituteId(): string {
    return this._instituteId;
  }

  public get subjectId(): string {
    return this._subjectId;
  }

  public get programId(): string | null {
    return this._programId;
  }

  public get teacherId(): string | null {
    return this._teacherId;
  }

  public get name(): string {
    return this._name;
  }

  public get code(): BatchCode {
    return this._code;
  }

  public get capacity(): number | null {
    return this._capacity;
  }

  public get status(): BatchStatus {
    return this._status;
  }

  public get startDate(): Date | null {
    return this._startDate ? new Date(this._startDate.getTime()) : null;
  }

  public get endDate(): Date | null {
    return this._endDate ? new Date(this._endDate.getTime()) : null;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  public get deletedAt(): Date | null {
    return this._deletedAt ? new Date(this._deletedAt.getTime()) : null;
  }

  // ── State Mutators ─────────────────────────────────────────────────────────

  public updateProfile(props: {
    name?: string;
    programId?: string | null;
    capacity?: number | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
  }): void {
    if (this._status === 'archived') {
      throw new ValidationError('Cannot update an archived batch');
    }

    let changed = false;

    if (props.name !== undefined) {
      const nameVal = BatchEntity.validateName(props.name);
      if (this._name !== nameVal) {
        this._name = nameVal;
        changed = true;
      }
    }

    if (props.programId !== undefined) {
      const progVal = props.programId ? props.programId.trim() || null : null;
      if (this._programId !== progVal) {
        this._programId = progVal;
        changed = true;
      }
    }

    if (props.capacity !== undefined) {
      const capVal = props.capacity !== null ? BatchEntity.validateCapacity(props.capacity) : null;
      if (this._capacity !== capVal) {
        this._capacity = capVal;
        changed = true;
      }
    }

    if (props.startDate !== undefined || props.endDate !== undefined) {
      const newStart = props.startDate !== undefined ? props.startDate : this._startDate;
      const newEnd = props.endDate !== undefined ? props.endDate : this._endDate;
      const { startDate, endDate } = BatchEntity.validateDates(newStart, newEnd);
      this._startDate = startDate;
      this._endDate = endDate;
      changed = true;
    }

    if (changed) {
      this._updatedAt = new Date();
    }
  }

  public assignTeacher(teacherId: string | null): void {
    if (this._status === 'archived') {
      throw new ValidationError('Cannot assign teacher to an archived batch');
    }
    const val = teacherId ? teacherId.trim() || null : null;
    if (this._teacherId !== val) {
      this._teacherId = val;
      this._updatedAt = new Date();
    }
  }

  /**
   * Transition state to "open" (open for prospective student enrollment).
   * Valid from: "draft".
   */
  public open(): void {
    if (this._status === 'archived') {
      throw new ValidationError('Cannot open an archived batch');
    }
    if (this._status === 'completed') {
      throw new ValidationError('Cannot open a completed batch');
    }
    if (this._status === 'running') {
      throw new ValidationError('Batch is already running');
    }
    if (this._status === 'open') return;

    this._status = 'open';
    this._updatedAt = new Date();
  }

  /**
   * Transition state to "running" (classes actively underway).
   * Valid from: "open". Rejects directly starting from "draft", "completed", or "archived".
   */
  public start(): void {
    if (this._status === 'archived') {
      throw new ValidationError('Cannot start an archived batch');
    }
    if (this._status === 'completed') {
      throw new ValidationError('Cannot start a completed batch');
    }
    if (this._status === 'draft') {
      throw new ValidationError('Cannot start a batch in "draft" status. Open the batch first.');
    }
    if (this._status === 'running') return;

    this._status = 'running';
    this._updatedAt = new Date();
  }

  /**
   * Transition state to "completed" (term concluded).
   * Valid from: "running". Rejects completing a "draft" or "open" batch directly.
   */
  public complete(): void {
    if (this._status === 'archived') {
      throw new ValidationError('Cannot complete an archived batch');
    }
    if (this._status === 'draft' || this._status === 'open') {
      throw new ValidationError(`Cannot complete a batch in "${this._status}" status. Batch must be running first.`);
    }
    if (this._status === 'completed') return;

    this._status = 'completed';
    this._updatedAt = new Date();
  }

  /**
   * Transition state to "archived". Soft archives the batch.
   */
  public archive(): void {
    if (this._status === 'archived') return;

    const now = new Date();
    this._status = 'archived';
    this._deletedAt = now;
    this._updatedAt = now;
  }

  public toDTO(): BatchDTO {
    return {
      id: this._id,
      instituteId: this._instituteId,
      subjectId: this._subjectId,
      programId: this._programId,
      teacherId: this._teacherId,
      name: this._name,
      code: this._code.value,
      capacity: this._capacity,
      status: this._status,
      startDate: this._startDate ? this._startDate.toISOString() : null,
      endDate: this._endDate ? this._endDate.toISOString() : null,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      deletedAt: this._deletedAt ? this._deletedAt.toISOString() : null,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private static validateName(name: string): string {
    if (!name || typeof name !== 'string') {
      throw new ValidationError('Batch name cannot be empty');
    }
    const trimmed = name.trim();
    if (trimmed === '') {
      throw new ValidationError('Batch name cannot be empty');
    }
    if (trimmed.length > 100) {
      throw new ValidationError('Batch name cannot exceed 100 characters');
    }
    return trimmed;
  }

  private static validateCapacity(capacity: number): number {
    if (typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity <= 0) {
      throw new ValidationError(`Invalid batch capacity: "${capacity}". Capacity must be a positive integer.`);
    }
    return capacity;
  }

  private static validateStatus(status: string): BatchStatus {
    const validStatuses: BatchStatus[] = ['draft', 'open', 'running', 'completed', 'archived'];
    if (!status || !validStatuses.includes(status as BatchStatus)) {
      throw new ValidationError(`Invalid batch status: "${status}"`);
    }
    return status as BatchStatus;
  }

  private static validateDates(
    startDate?: Date | string | null,
    endDate?: Date | string | null,
  ): { startDate: Date | null; endDate: Date | null } {
    let start: Date | null = null;
    let end: Date | null = null;

    if (startDate) {
      start = startDate instanceof Date ? startDate : new Date(startDate);
      if (Number.isNaN(start.getTime())) {
        throw new ValidationError('Invalid batch start date');
      }
    }

    if (endDate) {
      end = endDate instanceof Date ? endDate : new Date(endDate);
      if (Number.isNaN(end.getTime())) {
        throw new ValidationError('Invalid batch end date');
      }
    }

    if (start && end && end.getTime() <= start.getTime()) {
      throw new ValidationError('Batch end date must be strictly after start date');
    }

    return { startDate: start, endDate: end };
  }
}
