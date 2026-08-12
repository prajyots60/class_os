import { ValidationError } from '@coaching-os/shared';

/**
 * ProgramCode Value Object
 *
 * Encapsulates validation, normalization, immutability, and equality for Program codes.
 *
 * RULES:
 * - Trimmed & normalized to uppercase.
 * - Allowed characters: Alphanumeric, hyphens, underscores.
 * - Length: 2 to 50 characters.
 */
export class ProgramCode {
  private readonly _value: string;

  private constructor(rawCode: string) {
    if (!rawCode || typeof rawCode !== 'string') {
      throw new ValidationError('Program code must be a non-empty string');
    }

    const normalized = ProgramCode.normalize(rawCode);

    if (!ProgramCode.isValid(normalized)) {
      throw new ValidationError(
        `Invalid program code: "${rawCode}". Program codes must be 2-50 alphanumeric characters (hyphens and underscores allowed).`,
      );
    }

    this._value = normalized;
  }

  public static create(code: string | ProgramCode): ProgramCode {
    if (code instanceof ProgramCode) {
      return code;
    }
    return new ProgramCode(code);
  }

  public static normalize(rawCode: string): string {
    return rawCode.trim().toUpperCase();
  }

  public static isValid(code: string): boolean {
    if (code.length < 2 || code.length > 50) {
      return false;
    }
    return /^[A-Z0-9_\-]+$/.test(code);
  }

  public get value(): string {
    return this._value;
  }

  public equals(other: ProgramCode | string): boolean {
    if (!other) return false;
    const otherVal = typeof other === 'string' ? ProgramCode.normalize(other) : other.value;
    return this._value === otherVal;
  }

  public toString(): string {
    return this._value;
  }
}
