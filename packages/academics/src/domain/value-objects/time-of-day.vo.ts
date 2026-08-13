import { ValidationError } from '@coaching-os/shared';

/**
 * Represents a 24-hour time of day formatted as HH:mm (00:00 to 23:59).
 */
export class TimeOfDay {
  private readonly _value: string;
  private readonly _minutesFromMidnight: number;

  private constructor(value: string, minutesFromMidnight: number) {
    this._value = value;
    this._minutesFromMidnight = minutesFromMidnight;
  }

  public static create(value: unknown): TimeOfDay {
    if (!value || typeof value !== 'string') {
      throw new ValidationError('Time of day must be a non-empty string');
    }

    const trimmed = value.trim();
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!timeRegex.test(trimmed)) {
      throw new ValidationError(
        `Invalid time format: "${value}". Must be in 24-hour HH:mm format (e.g., 09:30, 17:00).`,
      );
    }

    const [hoursStr, minutesStr] = trimmed.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    const totalMinutes = hours * 60 + minutes;

    return new TimeOfDay(trimmed, totalMinutes);
  }

  public get value(): string {
    return this._value;
  }

  public get minutesFromMidnight(): number {
    return this._minutesFromMidnight;
  }

  public isBefore(other: TimeOfDay): boolean {
    return this._minutesFromMidnight < other._minutesFromMidnight;
  }

  public isAfter(other: TimeOfDay): boolean {
    return this._minutesFromMidnight > other._minutesFromMidnight;
  }

  public equals(other: TimeOfDay): boolean {
    return Boolean(other && this._value === other._value);
  }

  public toString(): string {
    return this._value;
  }
}
