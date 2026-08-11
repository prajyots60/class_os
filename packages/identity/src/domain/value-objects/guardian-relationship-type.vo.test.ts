import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import {
  GuardianRelationshipTypeVO,
  VALID_GUARDIAN_RELATIONSHIP_TYPES,
} from './guardian-relationship-type.vo';

describe('GuardianRelationshipTypeVO', () => {
  it('should create a valid relationship type VO for all supported types', () => {
    for (const type of VALID_GUARDIAN_RELATIONSHIP_TYPES) {
      const vo = GuardianRelationshipTypeVO.create(type);
      expect(vo.value).toBe(type);
      expect(vo.toString()).toBe(type);
    }
  });

  it('should normalize uppercase or whitespace inputs', () => {
    const vo = GuardianRelationshipTypeVO.create(' FATHER  ');
    expect(vo.value).toBe('father');
  });

  it('should throw ValidationError for unsupported relationship types', () => {
    expect(() => GuardianRelationshipTypeVO.create('uncle')).toThrow(ValidationError);
    expect(() => GuardianRelationshipTypeVO.create('friend')).toThrow(ValidationError);
    expect(() => GuardianRelationshipTypeVO.create('')).toThrow(ValidationError);
  });

  it('should check equality correctly', () => {
    const vo1 = GuardianRelationshipTypeVO.create('father');
    const vo2 = GuardianRelationshipTypeVO.create('father');
    const vo3 = GuardianRelationshipTypeVO.create('mother');

    expect(vo1.equals(vo2)).toBe(true);
    expect(vo1.equals(vo3)).toBe(false);
    expect(vo1.equals('father')).toBe(true);
    expect(vo1.equals('mother')).toBe(false);
  });
});
