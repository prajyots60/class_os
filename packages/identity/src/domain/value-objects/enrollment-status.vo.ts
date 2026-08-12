import { ValidationError } from '@coaching-os/shared';

export type EnrollmentStatus = 'pending' | 'active' | 'completed' | 'withdrawn' | 'transferred' | 'cancelled';

export const VALID_ENROLLMENT_STATUSES: readonly EnrollmentStatus[] = [
  'pending',
  'active',
  'completed',
  'withdrawn',
  'transferred',
  'cancelled',
] as const;

/**
 * EnrollmentStatus Value Object
 *
 * Represents the controlled state machine status of a student's enrollment in an academic batch.
 *
 * ARCHITECTURAL CONTRACT:
 * - Framework-independent, zero ORM or HTTP framework dependencies.
 * - Enforces controlled taxonomy (`pending`, `active`, `completed`, `withdrawn`, `transferred`, `cancelled`).
 * - Immutable value object with equality checking and terminal state helpers.
 */
export class EnrollmentStatusVO {
  private readonly _value: EnrollmentStatus;

  private constructor(status: string) {
    if (!status || typeof status !== 'string') {
      throw new ValidationError('Enrollment status must be a non-empty string');
    }

    const normalized = status.trim().toLowerCase() as EnrollmentStatus;

    if (!VALID_ENROLLMENT_STATUSES.includes(normalized)) {
      throw new ValidationError(
        `Invalid enrollment status: "${status}". Valid statuses are: ${VALID_ENROLLMENT_STATUSES.join(', ')}`,
      );
    }

    this._value = normalized;
  }

  /**
   * Factory method to create an EnrollmentStatusVO.
   */
  public static create(status: string): EnrollmentStatusVO {
    return new EnrollmentStatusVO(status);
  }

  /**
   * Return the canonical enrollment status value string.
   */
  public get value(): EnrollmentStatus {
    return this._value;
  }

  /**
   * Check whether the status represents a terminal state.
   * `completed`, `withdrawn`, `transferred`, and `cancelled` are terminal states for a given record.
   */
  public get isTerminal(): boolean {
    return (
      this._value === 'completed' ||
      this._value === 'withdrawn' ||
      this._value === 'transferred' ||
      this._value === 'cancelled'
    );
  }

  /**
   * Check whether the status consumes batch capacity (`active` or `pending`).
   */
  public get isActiveOrPending(): boolean {
    return this._value === 'active' || this._value === 'pending';
  }

  /**
   * Value equality check.
   */
  public equals(other: EnrollmentStatusVO | string): boolean {
    if (typeof other === 'string') {
      return this._value === other.trim().toLowerCase();
    }
    return this._value === other.value;
  }

  public toString(): string {
    return this._value;
  }
}
