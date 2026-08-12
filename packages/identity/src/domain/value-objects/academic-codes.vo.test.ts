import { describe, expect, it } from 'vitest';
import { BatchCode } from './batch-code.vo';
import { ProgramCode } from './program-code.vo';
import { SubjectCode } from './subject-code.vo';

describe('Academic Code Value Objects', () => {
  describe('ProgramCode', () => {
    it('creates a valid ProgramCode and normalizes to uppercase', () => {
      const code = ProgramCode.create('jee-2027');
      expect(code.value).toBe('JEE-2027');
      expect(code.toString()).toBe('JEE-2027');
    });

    it('returns true for equality check with string or object', () => {
      const code1 = ProgramCode.create('NEET_2027');
      const code2 = ProgramCode.create('neet_2027');
      expect(code1.equals(code2)).toBe(true);
      expect(code1.equals('neet_2027')).toBe(true);
    });

    it('throws ValidationError for empty or invalid code', () => {
      expect(() => ProgramCode.create('')).toThrow();
      expect(() => ProgramCode.create('A')).toThrow(); // less than 2 chars
      expect(() => ProgramCode.create('CODE WITH SPACES')).toThrow();
    });
  });

  describe('SubjectCode', () => {
    it('creates a valid SubjectCode and normalizes', () => {
      const code = SubjectCode.create('phy-101');
      expect(code.value).toBe('PHY-101');
    });

    it('throws ValidationError for invalid code', () => {
      expect(() => SubjectCode.create('P')).toThrow();
      expect(() => SubjectCode.create('PHY#101')).toThrow();
    });
  });

  describe('BatchCode', () => {
    it('creates a valid BatchCode', () => {
      const code = BatchCode.create('batch_a1');
      expect(code.value).toBe('BATCH_A1');
    });

    it('throws ValidationError for invalid batch code', () => {
      expect(() => BatchCode.create('')).toThrow();
    });
  });
});
