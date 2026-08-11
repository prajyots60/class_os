import { describe, it, expect } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { PhoneNumber } from './phone-number.vo';

describe('PhoneNumber Value Object', () => {
  it('constructs a valid PhoneNumber from E.164 string', () => {
    const phone = PhoneNumber.create('+919876543210');
    expect(phone.value).toBe('+919876543210');
    expect(phone.toString()).toBe('+919876543210');
  });

  it('normalizes 10-digit Indian mobile number to E.164', () => {
    const phone = PhoneNumber.create('9876543210');
    expect(phone.value).toBe('+919876543210');
  });

  it('normalizes Indian phone number with leading zero', () => {
    const phone = PhoneNumber.create('09876543210');
    expect(phone.value).toBe('+919876543210');
  });

  it('strips formatting characters like spaces, hyphens, and parentheses', () => {
    const phone1 = PhoneNumber.create('+91 (987) 654-3210');
    expect(phone1.value).toBe('+919876543210');

    const phone2 = PhoneNumber.create('+1-415-555-0132');
    expect(phone2.value).toBe('+14155550132');
  });

  it('compares equality correctly across different input formats', () => {
    const phone1 = PhoneNumber.create('9876543210');
    const phone2 = PhoneNumber.create('+91 98765-43210');

    expect(phone1.equals(phone2)).toBe(true);
    expect(phone1.equals('+919876543210')).toBe(true);
    expect(phone1.equals('9876543210')).toBe(true);
    expect(phone1.equals('+14155550132')).toBe(false);
  });

  it('returns false when comparing equality with null or empty values', () => {
    const phone = PhoneNumber.create('+919876543210');
    expect(phone.equals('')).toBe(false);
    expect(phone.equals(null as any)).toBe(false);
  });

  it('throws ValidationError for empty or non-string inputs', () => {
    expect(() => PhoneNumber.create('')).toThrow(ValidationError);
    expect(() => PhoneNumber.create('   ')).toThrow(ValidationError);
    expect(() => PhoneNumber.create(null as any)).toThrow(ValidationError);
  });

  it('throws ValidationError for invalid phone number formats', () => {
    expect(() => PhoneNumber.create('abc')).toThrow(ValidationError);
    expect(() => PhoneNumber.create('+')).toThrow(ValidationError);
    expect(() => PhoneNumber.create('123')).toThrow(ValidationError);
    expect(() => PhoneNumber.create('+0000000000000000000')).toThrow(ValidationError);
  });
});
