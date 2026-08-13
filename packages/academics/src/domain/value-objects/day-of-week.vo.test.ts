import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { DayOfWeek } from './day-of-week.vo';

describe('DayOfWeek Value Object', () => {
  it('should create valid DayOfWeek instance for lowercase and uppercase inputs', () => {
    const monday = DayOfWeek.create('monday');
    expect(monday.value).toBe('monday');
    expect(monday.getDayIndex()).toBe(1);

    const wednesday = DayOfWeek.create('WEDNESDAY');
    expect(wednesday.value).toBe('wednesday');
    expect(wednesday.getDayIndex()).toBe(3);

    const sunday = DayOfWeek.create('Sunday');
    expect(sunday.value).toBe('sunday');
    expect(sunday.getDayIndex()).toBe(0);
  });

  it('should throw ValidationError for invalid day strings', () => {
    expect(() => DayOfWeek.create('funday')).toThrow(ValidationError);
    expect(() => DayOfWeek.create('')).toThrow(ValidationError);
    expect(() => DayOfWeek.create(null)).toThrow(ValidationError);
  });

  it('should evaluate equality correctly', () => {
    const mon1 = DayOfWeek.create('monday');
    const mon2 = DayOfWeek.create('MONDAY');
    const tue = DayOfWeek.create('tuesday');

    expect(mon1.equals(mon2)).toBe(true);
    expect(mon1.equals(tue)).toBe(false);
  });
});
