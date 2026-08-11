import { ValidationError } from '@coaching-os/shared';

/**
 * PhoneNumber Value Object
 *
 * Encapsulates phone number validation, normalization to canonical E.164 format,
 * immutability, and equality comparison for CoachingOS global identities.
 *
 * ARCHITECTURAL CONTRACT:
 * - Normalizes inputs (strips spaces, hyphens, parentheses).
 * - Defaults 10-digit Indian numbers to '+91'.
 * - Enforces E.164 regex compliance (/^\+[1-9]\d{1,14}$/).
 * - Value equality operates on canonical E.164 representation.
 * - Framework-independent, zero infrastructure dependencies.
 */
export class PhoneNumber {
  private readonly _value: string;

  private constructor(rawPhone: string) {
    if (!rawPhone || typeof rawPhone !== 'string') {
      throw new ValidationError('Phone number must be a non-empty string');
    }

    const normalized = PhoneNumber.normalize(rawPhone);

    if (!PhoneNumber.isValid(normalized)) {
      throw new ValidationError(
        `Invalid phone number format: "${rawPhone}". Phone numbers must conform to E.164 format (e.g. +919876543210).`,
      );
    }

    this._value = normalized;
  }

  /**
   * Factory method to construct a valid PhoneNumber value object.
   */
  public static create(phone: string | PhoneNumber): PhoneNumber {
    if (phone instanceof PhoneNumber) {
      return phone;
    }
    return new PhoneNumber(phone);
  }

  /**
   * Normalizes raw phone strings into canonical E.164 format.
   * Strips spaces, hyphens, dots, and parentheses.
   * Prepends '+91' if given a raw 10-digit Indian mobile number.
   */
  public static normalize(rawPhone: string): string {
    const cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '');

    // Handle 10-digit Indian phone number without country code
    if (/^\d{10}$/.test(cleaned)) {
      return `+91${cleaned}`;
    }

    // Handle number starting with 0 (e.g. 09876543210)
    if (/^0\d{10}$/.test(cleaned)) {
      return `+91${cleaned.substring(1)}`;
    }

    // Ensure leading '+' if starts with valid digits
    if (/^[1-9]\d{7,14}$/.test(cleaned)) {
      return `+${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Validates if a normalized string strictly conforms to E.164 standard.
   */
  public static isValid(phone: string): boolean {
    // E.164 format: '+' followed by 8 to 15 digits (country code + subscriber number)
    return /^\+[1-9]\d{7,14}$/.test(phone);
  }

  /**
   * Returns the canonical E.164 normalized string.
   */
  public get value(): string {
    return this._value;
  }

  /**
   * Value equality check against another PhoneNumber or raw phone string.
   */
  public equals(other: PhoneNumber | string): boolean {
    if (!other) return false;
    const otherValue = typeof other === 'string' ? PhoneNumber.normalize(other) : other.value;
    return this._value === otherValue;
  }

  public toString(): string {
    return this._value;
  }
}
