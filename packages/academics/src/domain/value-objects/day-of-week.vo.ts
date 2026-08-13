import { ValidationError } from '@coaching-os/shared';

export type DayOfWeekValue =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

const VALID_DAYS: Record<DayOfWeekValue, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export class DayOfWeek {
  private readonly _value: DayOfWeekValue;

  private constructor(value: DayOfWeekValue) {
    this._value = value;
  }

  public static create(value: unknown): DayOfWeek {
    if (!value || typeof value !== 'string') {
      throw new ValidationError('Day of week must be a non-empty string');
    }

    const normalized = value.trim().toLowerCase() as DayOfWeekValue;
    if (!(normalized in VALID_DAYS)) {
      throw new ValidationError(
        `Invalid day of week: "${value}". Must be one of: monday, tuesday, wednesday, thursday, friday, saturday, sunday.`,
      );
    }

    return new DayOfWeek(normalized);
  }

  public get value(): DayOfWeekValue {
    return this._value;
  }

  public getDayIndex(): number {
    return VALID_DAYS[this._value];
  }

  public equals(other: DayOfWeek): boolean {
    return Boolean(other && this._value === other._value);
  }

  public toString(): string {
    return this._value;
  }
}
