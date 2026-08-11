import { describe, expect, it } from 'vitest';
import { DateOfBirth } from './date-of-birth.vo';

describe('DateOfBirth Value Object', () => {
  it('should construct valid DateOfBirth from YYYY-MM-DD string', () => {
    const dob = DateOfBirth.create('2010-05-15');
    expect(dob.value).toBe('2010-05-15');
    expect(dob.toString()).toBe('2010-05-15');
    expect(dob.toDate()).toEqual(new Date('2010-05-15T00:00:00.000Z'));
  });

  it('should construct valid DateOfBirth from Date object', () => {
    const dateObj = new Date('2008-11-20T10:30:00.000Z');
    const dob = DateOfBirth.create(dateObj);
    expect(dob.value).toBe('2008-11-20');
  });

  it('should return self when passing existing DateOfBirth instance', () => {
    const original = DateOfBirth.create('2012-01-01');
    const copy = DateOfBirth.create(original);
    expect(copy).toBe(original);
  });

  it('should reject invalid string formats', () => {
    expect(() => DateOfBirth.create('15-05-2010')).toThrow(/YYYY-MM-DD/);
    expect(() => DateOfBirth.create('2010/05/15')).toThrow(/YYYY-MM-DD/);
    expect(() => DateOfBirth.create('invalid')).toThrow(/YYYY-MM-DD/);
  });

  it('should reject year prior to 1900', () => {
    expect(() => DateOfBirth.create('1899-12-31')).toThrow(/earlier than 1900/);
  });

  it('should reject future birth dates', () => {
    const futureYear = new Date().getUTCFullYear() + 5;
    expect(() => DateOfBirth.create(`${futureYear}-01-01`)).toThrow(/cannot be in the future/);
  });

  it('should perform equality comparisons correctly', () => {
    const dob1 = DateOfBirth.create('2010-05-15');
    const dob2 = DateOfBirth.create('2010-05-15');
    const dob3 = DateOfBirth.create('2010-05-16');

    expect(dob1.equals(dob2)).toBe(true);
    expect(dob1.equals(dob3)).toBe(false);
    expect(dob1.equals('2010-05-15')).toBe(true);
  });
});
