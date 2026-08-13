import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';

export interface MarksProps {
  id: string;
  instituteId: string;
  testId: string;
  enrollmentId: string;
  marksObtained: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMarksProps {
  id?: string;
  instituteId: string;
  testId: string;
  enrollmentId: string;
  marksObtained: number;
  maximumMarks: number;
}

export interface MarksDTO {
  id: string;
  instituteId: string;
  testId: string;
  enrollmentId: string;
  marksObtained: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Marks Domain Entity
 *
 * Represents an individual student enrollment mark for a concrete Test.
 *
 * INVARIANTS:
 * - ACADEMIC-003 / ACADEMIC-008: Anchored strictly to `(testId, enrollmentId)`. Never directly to Student.
 * - ACADEMIC-006: Tenant-scoped by `instituteId`.
 * - ACADEMIC-010: `0 <= marksObtained <= test.maximumMarks`.
 * - Precision: Decimal precision up to 2 decimal places.
 */
export class MarksEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private readonly _testId: string;
  private readonly _enrollmentId: string;
  private _marksObtained: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: MarksProps) {
    this.validateId(props.id, 'Marks ID');
    this.validateId(props.instituteId, 'Institute ID');
    this.validateId(props.testId, 'Test ID');
    this.validateId(props.enrollmentId, 'Enrollment ID');

    this._id = props.id.trim();
    this._instituteId = props.instituteId.trim();
    this._testId = props.testId.trim();
    this._enrollmentId = props.enrollmentId.trim();
    this._marksObtained = props.marksObtained;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  private validateId(val: string, name: string): void {
    if (!val || typeof val !== 'string' || val.trim() === '') {
      throw new ValidationError(`${name} cannot be empty`);
    }
  }

  public static validateMarksObtained(val: number, maximumMarks: number): number {
    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
      throw new ValidationError('Marks obtained must be a valid number');
    }

    if (val < 0) {
      throw new ValidationError(`Marks obtained cannot be negative (${val}) (ACADEMIC-010)`);
    }

    if (val > maximumMarks) {
      throw new ValidationError(
        `Marks obtained (${val}) cannot exceed test maximum marks (${maximumMarks}) (ACADEMIC-010)`,
      );
    }

    // Precision check: up to 2 decimal places
    const rounded = Math.round(val * 100) / 100;
    if (Math.abs(val - rounded) > 0.0001) {
      throw new ValidationError(`Marks obtained (${val}) cannot exceed 2 decimal places precision`);
    }

    return rounded;
  }

  public static create(props: CreateMarksProps): MarksEntity {
    const validatedMarks = MarksEntity.validateMarksObtained(props.marksObtained, props.maximumMarks);
    const now = new Date();

    return new MarksEntity({
      id: props.id || crypto.randomUUID(),
      instituteId: props.instituteId,
      testId: props.testId,
      enrollmentId: props.enrollmentId,
      marksObtained: validatedMarks,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static from(props: MarksProps): MarksEntity {
    return new MarksEntity(props);
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  public get id(): string {
    return this._id;
  }

  public get instituteId(): string {
    return this._instituteId;
  }

  public get testId(): string {
    return this._testId;
  }

  public get enrollmentId(): string {
    return this._enrollmentId;
  }

  public get marksObtained(): number {
    return this._marksObtained;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  // ── State Mutators ─────────────────────────────────────────────────────────

  public updateMarksObtained(marksObtained: number, maximumMarks: number): void {
    const validated = MarksEntity.validateMarksObtained(marksObtained, maximumMarks);
    if (this._marksObtained !== validated) {
      this._marksObtained = validated;
      this._updatedAt = new Date();
    }
  }

  public toDTO(): MarksDTO {
    return {
      id: this._id,
      instituteId: this._instituteId,
      testId: this._testId,
      enrollmentId: this._enrollmentId,
      marksObtained: this._marksObtained,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
