import { ValidationError } from '@coaching-os/shared';

/**
 * DateOfBirth Value Object
 *
 * Encapsulates date-of-birth validation, canonical ISO date string format (YYYY-MM-DD),
 * immutability, and date range sanity checks for CoachingOS entities.
 *
 * ARCHITECTURAL CONTRACT:
 * - Accepts ISO date strings (e.g. '2010-05-15'), JavaScript Date objects, or DateOfBirth instances.
 * - Ensures date is valid, not in the future, and not earlier than 1900-01-01.
 * - Prevents timezone shifting by parsing/formatting strictly in UTC date components.
 * - Value equality operates on canonical YYYY-MM-DD date representation.
 * - Framework-independent, zero infrastructure dependencies.
 */
export class DateOfBirth {
  private readonly _value: string; // YYYY-MM-DD
  private readonly _date: Date;

  private constructor(rawInput: string | Date) {
    let dateObj: Date;

    if (typeof rawInput === 'string') {
      const trimmed = rawInput.trim();
      // Match YYYY-MM-DD format strictly
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        throw new ValidationError(
          `Invalid date of birth format: "${rawInput}". Date must be in YYYY-MM-DD format.`,
        );
      }
      dateObj = new Date(`${trimmed}T00:00:00.000Z`);
    } else if (rawInput instanceof Date) {
      dateObj = new Date(rawInput.getTime());
    } else {
      throw new ValidationError('Date of birth must be a YYYY-MM-DD string or Date object');
    }

    if (Number.isNaN(dateObj.getTime())) {
      throw new ValidationError('Invalid date of birth value');
    }

    // Range checks
    const year = dateObj.getUTCFullYear();
    if (year < 1900) {
      throw new ValidationError('Date of birth year cannot be earlier than 1900');
    }

    const now = new Date();
    if (dateObj.getTime() > now.getTime()) {
      throw new ValidationError('Date of birth cannot be in the future');
    }

    // Format as canonical YYYY-MM-DD
    const isoString = dateObj.toISOString().split('T')[0];
    if (!isoString) {
      throw new ValidationError('Failed to format date of birth');
    }

    this._value = isoString;
    this._date = new Date(`${isoString}T00:00:00.000Z`);
  }

  /**
   * Factory method to construct a valid DateOfBirth value object.
   */
  public static create(input: string | Date | DateOfBirth): DateOfBirth {
    if (input instanceof DateOfBirth) {
      return input;
    }
    return new DateOfBirth(input);
  }

  /**
   * Returns canonical YYYY-MM-DD date string.
   */
  public get value(): string {
    return this._value;
  }

  /**
   * Returns a copy of the UTC Date object.
   */
  public toDate(): Date {
    return new Date(this._date.getTime());
  }

  /**
   * Value equality check against another DateOfBirth or raw date string/object.
   */
  public equals(other: DateOfBirth | string | Date): boolean {
    if (!other) return false;
    const otherValue =
      other instanceof DateOfBirth
        ? other.value
        : typeof other === 'string'
          ? DateOfBirth.create(other).value
          : DateOfBirth.create(other).value;
    return this._value === otherValue;
  }

  public toString(): string {
    return this._value;
  }
}
