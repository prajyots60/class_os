import { ValidationError } from '@coaching-os/shared';

export type GuardianRelationshipType =
  | 'father'
  | 'mother'
  | 'guardian'
  | 'stepfather'
  | 'stepmother'
  | 'grandparent'
  | 'sibling'
  | 'other';

export const VALID_GUARDIAN_RELATIONSHIP_TYPES: readonly GuardianRelationshipType[] = [
  'father',
  'mother',
  'guardian',
  'stepfather',
  'stepmother',
  'grandparent',
  'sibling',
  'other',
] as const;

/**
 * GuardianRelationshipType Value Object
 *
 * Represents the controlled, platform-owned relationship taxonomy between a parent and a student.
 *
 * ARCHITECTURAL CONTRACT:
 * - Framework-independent, zero ORM or HTTP framework dependencies.
 * - Enforces controlled vocabulary: arbitrary string values are strictly rejected.
 * - Immutable value object with equality checking.
 */
export class GuardianRelationshipTypeVO {
  private readonly _value: GuardianRelationshipType;

  private constructor(type: string) {
    if (!type || typeof type !== 'string') {
      throw new ValidationError('Guardian relationship type must be a non-empty string');
    }

    const normalized = type.trim().toLowerCase() as GuardianRelationshipType;

    if (!VALID_GUARDIAN_RELATIONSHIP_TYPES.includes(normalized)) {
      throw new ValidationError(
        `Invalid guardian relationship type: "${type}". Valid types are: ${VALID_GUARDIAN_RELATIONSHIP_TYPES.join(', ')}`,
      );
    }

    this._value = normalized;
  }

  /**
   * Factory method to create a GuardianRelationshipTypeVO.
   */
  public static create(type: string): GuardianRelationshipTypeVO {
    return new GuardianRelationshipTypeVO(type);
  }

  /**
   * Return the canonical relationship type value string.
   */
  public get value(): GuardianRelationshipType {
    return this._value;
  }

  /**
   * Value equality check.
   */
  public equals(other: GuardianRelationshipTypeVO | string): boolean {
    if (typeof other === 'string') {
      return this._value === other.trim().toLowerCase();
    }
    return this._value === other.value;
  }

  public toString(): string {
    return this._value;
  }
}
