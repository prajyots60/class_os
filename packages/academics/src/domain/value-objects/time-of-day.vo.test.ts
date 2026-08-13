import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { TimeOfDay } from './time-of-day.vo';

describe('TimeOfDay Value Object', () => {
  it('should create valid TimeOfDay instance for valid HH:mm strings', () => {
    const t1 = TimeOfDay.create('09:00');
    expect(t1.value).toBe('09:00');
    expect(t1.minutesFromMidnight).toBe(540);

    const t2 = TimeOfDay.create('17:30');
    expect(t2.value).toBe('17:30');
    expect(t2.minutesFromMidnight).toBe(1050);
  });

  it('should throw ValidationError for invalid time strings', () => {
    expect(() => TimeOfDay.create('25:00')).toThrow(ValidationError);
    expect(() => TimeOfDay.create('17:60')).toThrow(ValidationError);
    expect(() => TimeOfDay.create('9:00')).toThrow(ValidationError);
    expect(() => TimeOfDay.create('invalid')).toThrow(ValidationError);
  });

  it('should compare times correctly', () => {
    const start = TimeOfDay.create('17:00');
    const end = TimeOfDay.create('18:30');

    expect(start.isBefore(end)).toBe(true);
    expect(end.isAfter(start)).toBe(true);
    expect(start.equals(TimeOfDay.create('17:00'))).toBe(true);
  });
});
