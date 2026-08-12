import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { EnrollmentStatusVO, type EnrollmentStatus } from '../value-objects/enrollment-status.vo';

export type { EnrollmentStatus };

export interface EnrollmentProps {
  id: string;
  instituteId: string;
  studentId: string;
  batchId: string;
  status: EnrollmentStatus;
  enrolledAt?: Date | string | null;
  completedAt?: Date | string | null;
  withdrawnAt?: Date | string | null;
  transferredAt?: Date | string | null;
  transferredToBatchId?: string | null;
  transferredToEnrollmentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateEnrollmentProps {
  id?: string;
  instituteId: string;
  studentId: string;
  batchId: string;
  status?: EnrollmentStatus;
  enrolledAt?: Date | string | null;
}

export interface EnrollmentDTO {
  id: string;
  instituteId: string;
  studentId: string;
  batchId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt: string | null;
  withdrawnAt: string | null;
  transferredAt: string | null;
  transferredToBatchId: string | null;
  transferredToEnrollmentId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Enrollment Domain Entity
 *
 * Represents a student's operational participation in a specific teaching batch within an institute tenant.
 *
 * ARCHITECTURAL CONTRACT (ADR-0014):
 * - Framework-independent aggregate root, zero database or HTTP framework dependencies.
 * - Multi-tenant isolation strictly bound by `instituteId`.
 * - Learner profile link bound by `studentId` (Student must be admitted & active).
 * - Teaching group link bound by `batchId` (Batch must be open or running).
 * - Immutability: `id`, `instituteId`, `studentId`, and `batchId` are IMMUTABLE.
 * - Batch transfers preserve source history: `batchId` is NEVER mutated. Transfer creates a new target Enrollment record
 *   and transitions source to status='transferred' with historical pointers.
 * - Explicit lifecycle state machine: `pending` | `active` | `completed` | `withdrawn` | `transferred` | `cancelled`.
 */
export class EnrollmentEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private readonly _studentId: string;
  private readonly _batchId: string;
  private _status: EnrollmentStatusVO;
  private _enrolledAt: Date;
  private _completedAt: Date | null;
  private _withdrawnAt: Date | null;
  private _transferredAt: Date | null;
  private _transferredToBatchId: string | null;
  private _transferredToEnrollmentId: string | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt: Date | null;

  private constructor(props: EnrollmentProps) {
    if (!props.id || typeof props.id !== 'string' || props.id.trim() === '') {
      throw new ValidationError('Enrollment ID cannot be empty');
    }

    if (!props.instituteId || typeof props.instituteId !== 'string' || props.instituteId.trim() === '') {
      throw new ValidationError('Institute ID cannot be empty');
    }

    if (!props.studentId || typeof props.studentId !== 'string' || props.studentId.trim() === '') {
      throw new ValidationError('Student ID cannot be empty');
    }

    if (!props.batchId || typeof props.batchId !== 'string' || props.batchId.trim() === '') {
      throw new ValidationError('Batch ID cannot be empty');
    }

    const validatedStatus = EnrollmentStatusVO.create(props.status);

    let parsedEnrolledAt: Date;
    if (props.enrolledAt) {
      parsedEnrolledAt = props.enrolledAt instanceof Date ? props.enrolledAt : new Date(props.enrolledAt);
      if (Number.isNaN(parsedEnrolledAt.getTime())) {
        throw new ValidationError('Invalid enrolledAt timestamp');
      }
    } else {
      parsedEnrolledAt = props.createdAt ? new Date(props.createdAt.getTime()) : new Date();
    }

    const parseOptionalDate = (val?: Date | string | null, fieldName = 'date'): Date | null => {
      if (!val) return null;
      const d = val instanceof Date ? val : new Date(val);
      if (Number.isNaN(d.getTime())) {
        throw new ValidationError(`Invalid ${fieldName} timestamp`);
      }
      return d;
    };

    this._id = props.id.trim();
    this._instituteId = props.instituteId.trim();
    this._studentId = props.studentId.trim();
    this._batchId = props.batchId.trim();
    this._status = validatedStatus;
    this._enrolledAt = parsedEnrolledAt;
    this._completedAt = parseOptionalDate(props.completedAt, 'completedAt');
    this._withdrawnAt = parseOptionalDate(props.withdrawnAt, 'withdrawnAt');
    this._transferredAt = parseOptionalDate(props.transferredAt, 'transferredAt');
    this._transferredToBatchId = props.transferredToBatchId ? props.transferredToBatchId.trim() : null;
    this._transferredToEnrollmentId = props.transferredToEnrollmentId ? props.transferredToEnrollmentId.trim() : null;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._deletedAt = parseOptionalDate(props.deletedAt, 'deletedAt');
  }

  /**
   * Factory method to create a new Enrollment aggregate.
   */
  public static create(props: CreateEnrollmentProps): EnrollmentEntity {
    const now = new Date();
    const status = props.status || 'pending';
    let enrolledAtDate: Date;

    if (props.enrolledAt) {
      enrolledAtDate = props.enrolledAt instanceof Date ? props.enrolledAt : new Date(props.enrolledAt);
      if (Number.isNaN(enrolledAtDate.getTime())) {
        throw new ValidationError('Invalid enrolledAt timestamp');
      }
    } else {
      enrolledAtDate = now;
    }

    return new EnrollmentEntity({
      id: props.id || crypto.randomUUID(),
      instituteId: props.instituteId,
      studentId: props.studentId,
      batchId: props.batchId,
      status,
      enrolledAt: enrolledAtDate,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute an Enrollment aggregate from persistence layer data.
   */
  public static from(props: EnrollmentProps): EnrollmentEntity {
    return new EnrollmentEntity(props);
  }

  // ── Getters (Read-Only Identity & Attributes) ────────────────────────────────

  public get id(): string {
    return this._id;
  }

  public get instituteId(): string {
    return this._instituteId;
  }

  public get studentId(): string {
    return this._studentId;
  }

  public get batchId(): string {
    return this._batchId;
  }

  public get status(): EnrollmentStatus {
    return this._status.value;
  }

  public get enrolledAt(): Date {
    return new Date(this._enrolledAt.getTime());
  }

  public get completedAt(): Date | null {
    return this._completedAt ? new Date(this._completedAt.getTime()) : null;
  }

  public get withdrawnAt(): Date | null {
    return this._withdrawnAt ? new Date(this._withdrawnAt.getTime()) : null;
  }

  public get transferredAt(): Date | null {
    return this._transferredAt ? new Date(this._transferredAt.getTime()) : null;
  }

  public get transferredToBatchId(): string | null {
    return this._transferredToBatchId;
  }

  public get transferredToEnrollmentId(): string | null {
    return this._transferredToEnrollmentId;
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

  // ── Domain State Machine Methods ─────────────────────────────────────────────

  /**
   * Transition enrollment to "active".
   * Allowed from "pending" (or no-op if already active).
   * Forbidden from terminal states ("completed", "withdrawn", "transferred", "cancelled").
   */
  public activate(enrolledAt?: Date | string): void {
    if (this._status.value === 'active') return;

    if (this._status.isTerminal) {
      throw new ValidationError(
        `Cannot activate enrollment from terminal status "${this._status.value}". Record is terminal.`,
      );
    }

    const now = new Date();
    if (enrolledAt) {
      const d = enrolledAt instanceof Date ? enrolledAt : new Date(enrolledAt);
      if (Number.isNaN(d.getTime())) {
        throw new ValidationError('Invalid enrolledAt timestamp');
      }
      this._enrolledAt = d;
    }

    this._status = EnrollmentStatusVO.create('active');
    this._updatedAt = now;
  }

  /**
   * Transition enrollment to "completed".
   * Allowed only from "active" state.
   */
  public complete(): void {
    if (this._status.value === 'completed') return;

    if (this._status.value !== 'active') {
      throw new ValidationError(
        `Cannot complete enrollment with status "${this._status.value}". Only active enrollments can be marked completed.`,
      );
    }

    const now = new Date();
    this._status = EnrollmentStatusVO.create('completed');
    this._completedAt = now;
    this._updatedAt = now;
  }

  /**
   * Transition enrollment to "withdrawn".
   * Allowed from "active" or "pending" state.
   */
  public withdraw(): void {
    if (this._status.value === 'withdrawn') return;

    if (this._status.value !== 'active' && this._status.value !== 'pending') {
      throw new ValidationError(
        `Cannot withdraw enrollment with status "${this._status.value}". Only pending or active enrollments can be withdrawn.`,
      );
    }

    const now = new Date();
    this._status = EnrollmentStatusVO.create('withdrawn');
    this._withdrawnAt = now;
    this._updatedAt = now;
  }

  /**
   * Transition enrollment to "cancelled".
   * Allowed only from "pending" state.
   */
  public cancel(): void {
    if (this._status.value === 'cancelled') return;

    if (this._status.value !== 'pending') {
      throw new ValidationError(
        `Cannot cancel enrollment with status "${this._status.value}". Only pending enrollments can be cancelled.`,
      );
    }

    const now = new Date();
    this._status = EnrollmentStatusVO.create('cancelled');
    this._updatedAt = now;
  }

  /**
   * Transition enrollment to "transferred" (Historical Preservation Pattern - Option B).
   * Allowed only from "active" state.
   * Note: The source enrollment's `batchId` remains untouched to preserve historic audit log.
   */
  public markTransferred(targetBatchId: string, targetEnrollmentId: string): void {
    if (!targetBatchId || typeof targetBatchId !== 'string' || targetBatchId.trim() === '') {
      throw new ValidationError('Target batch ID cannot be empty during enrollment transfer');
    }

    if (!targetEnrollmentId || typeof targetEnrollmentId !== 'string' || targetEnrollmentId.trim() === '') {
      throw new ValidationError('Target enrollment ID cannot be empty during enrollment transfer');
    }

    if (this._status.value !== 'active') {
      throw new ValidationError(
        `Cannot transfer enrollment with status "${this._status.value}". Only active enrollments can be transferred.`,
      );
    }

    const now = new Date();
    this._status = EnrollmentStatusVO.create('transferred');
    this._transferredAt = now;
    this._transferredToBatchId = targetBatchId.trim();
    this._transferredToEnrollmentId = targetEnrollmentId.trim();
    this._updatedAt = now;
  }

  /**
   * Soft archive enrollment record.
   */
  public archive(): void {
    const now = new Date();
    this._deletedAt = now;
    this._updatedAt = now;
  }

  /**
   * Convert entity state to plain DTO object.
   */
  public toDTO(): EnrollmentDTO {
    return {
      id: this._id,
      instituteId: this._instituteId,
      studentId: this._studentId,
      batchId: this._batchId,
      status: this._status.value,
      enrolledAt: this._enrolledAt.toISOString(),
      completedAt: this._completedAt ? this._completedAt.toISOString() : null,
      withdrawnAt: this._withdrawnAt ? this._withdrawnAt.toISOString() : null,
      transferredAt: this._transferredAt ? this._transferredAt.toISOString() : null,
      transferredToBatchId: this._transferredToBatchId,
      transferredToEnrollmentId: this._transferredToEnrollmentId,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      deletedAt: this._deletedAt ? this._deletedAt.toISOString() : null,
    };
  }
}
