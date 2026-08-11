import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import {
  GuardianRelationshipType,
  GuardianRelationshipTypeVO,
} from '../value-objects/guardian-relationship-type.vo';

export type GuardianRelationshipStatus = 'active' | 'archived';

export interface InstituteParentStudentProps {
  id: string;
  instituteId: string;
  instituteParentId: string;
  studentId: string;
  relationshipType: GuardianRelationshipType;
  isPrimary: boolean;
  status: GuardianRelationshipStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateInstituteParentStudentProps {
  id?: string;
  instituteId: string;
  instituteParentId: string;
  studentId: string;
  relationshipType: GuardianRelationshipType | GuardianRelationshipTypeVO;
  isPrimary?: boolean;
  status?: GuardianRelationshipStatus;
}

export interface InstituteParentStudentDTO {
  id: string;
  instituteId: string;
  instituteParentId: string;
  studentId: string;
  relationshipType: GuardianRelationshipType;
  isPrimary: boolean;
  status: GuardianRelationshipStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * InstituteParentStudent Domain Entity
 *
 * Tenant-scoped aggregate representing the linkage between an institute parent CRM record
 * and an admitted student learner profile.
 *
 * ARCHITECTURAL CONTRACT:
 * - Framework-independent, zero ORM or HTTP framework dependencies.
 * - Owned strictly by an Institute (`instituteId`).
 * - Contextually immutable: `id`, `instituteId`, `instituteParentId`, and `studentId` CANNOT be mutated.
 * - Manages independent lifecycle (`active` | `archived`) and primary contact status (`isPrimary`).
 * - MUST NOT recursively embed ParentIdentity or Student aggregates.
 */
export class InstituteParentStudentEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private readonly _instituteParentId: string;
  private readonly _studentId: string;
  private _relationshipType: GuardianRelationshipTypeVO;
  private _isPrimary: boolean;
  private _status: GuardianRelationshipStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt: Date | null;

  private constructor(props: InstituteParentStudentProps) {
    if (!props.id || typeof props.id !== 'string' || props.id.trim() === '') {
      throw new ValidationError('Relationship ID cannot be empty');
    }

    if (!props.instituteId || typeof props.instituteId !== 'string' || props.instituteId.trim() === '') {
      throw new ValidationError('Institute ID cannot be empty');
    }

    if (
      !props.instituteParentId ||
      typeof props.instituteParentId !== 'string' ||
      props.instituteParentId.trim() === ''
    ) {
      throw new ValidationError('Institute parent ID cannot be empty');
    }

    if (!props.studentId || typeof props.studentId !== 'string' || props.studentId.trim() === '') {
      throw new ValidationError('Student ID cannot be empty');
    }

    if (props.status !== 'active' && props.status !== 'archived') {
      throw new ValidationError(`Invalid relationship status: ${props.status}`);
    }

    const relTypeVO = GuardianRelationshipTypeVO.create(props.relationshipType);

    if (props.status === 'archived' && props.isPrimary) {
      throw new ValidationError('An archived relationship cannot be designated as primary');
    }

    this._id = props.id.trim();
    this._instituteId = props.instituteId.trim();
    this._instituteParentId = props.instituteParentId.trim();
    this._studentId = props.studentId.trim();
    this._relationshipType = relTypeVO;
    this._isPrimary = Boolean(props.isPrimary);
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._deletedAt = props.deletedAt ?? null;
  }

  /**
   * Factory method to create a new InstituteParentStudent relationship entity.
   */
  public static create(props: CreateInstituteParentStudentProps): InstituteParentStudentEntity {
    const now = new Date();
    const relType =
      props.relationshipType instanceof GuardianRelationshipTypeVO
        ? props.relationshipType.value
        : props.relationshipType;

    return new InstituteParentStudentEntity({
      id: props.id || crypto.randomUUID(),
      instituteId: props.instituteId,
      instituteParentId: props.instituteParentId,
      studentId: props.studentId,
      relationshipType: relType,
      isPrimary: props.isPrimary ?? false,
      status: props.status || 'active',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  /**
   * Reconstitute an InstituteParentStudent entity from persistence layer.
   */
  public static from(props: InstituteParentStudentProps): InstituteParentStudentEntity {
    return new InstituteParentStudentEntity(props);
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  public get id(): string {
    return this._id;
  }

  public get instituteId(): string {
    return this._instituteId;
  }

  public get instituteParentId(): string {
    return this._instituteParentId;
  }

  public get studentId(): string {
    return this._studentId;
  }

  public get relationshipType(): GuardianRelationshipType {
    return this._relationshipType.value;
  }

  public get relationshipTypeVO(): GuardianRelationshipTypeVO {
    return this._relationshipType;
  }

  public get isPrimary(): boolean {
    return this._isPrimary;
  }

  public get status(): GuardianRelationshipStatus {
    return this._status;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  public get deletedAt(): Date | null {
    return this._deletedAt ? new Date(this._deletedAt.getTime()) : null;
  }

  // ── Domain Invariants & State Mutators ──────────────────────────────────────

  /**
   * Updates the relationship taxonomy classification.
   */
  public updateRelationshipType(type: GuardianRelationshipType | GuardianRelationshipTypeVO): void {
    this.assertNotArchived('Cannot update relationship type of an archived relationship');

    const newVO =
      type instanceof GuardianRelationshipTypeVO ? type : GuardianRelationshipTypeVO.create(type);

    if (!this._relationshipType.equals(newVO)) {
      this._relationshipType = newVO;
      this._updatedAt = new Date();
    }
  }

  /**
   * Promotes relationship to primary guardian for the student.
   */
  public setPrimary(): void {
    this.assertNotArchived('Cannot designate an archived relationship as primary');

    if (!this._isPrimary) {
      this._isPrimary = true;
      this._updatedAt = new Date();
    }
  }

  /**
   * Removes primary guardian designation.
   */
  public unsetPrimary(): void {
    if (this._isPrimary) {
      this._isPrimary = false;
      this._updatedAt = new Date();
    }
  }

  /**
   * Soft-archives the relationship link. Terminal transition.
   */
  public archive(): void {
    if (this._status === 'archived') {
      return;
    }

    this._status = 'archived';
    this._isPrimary = false;
    const now = new Date();
    this._updatedAt = now;
    this._deletedAt = now;
  }

  /**
   * Export domain state for DTO serialization.
   */
  public toDTO(): InstituteParentStudentDTO {
    return {
      id: this._id,
      instituteId: this._instituteId,
      instituteParentId: this._instituteParentId,
      studentId: this._studentId,
      relationshipType: this._relationshipType.value,
      isPrimary: this._isPrimary,
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      deletedAt: this._deletedAt ? this._deletedAt.toISOString() : null,
    };
  }

  // ── Private Helper ─────────────────────────────────────────────────────────

  private assertNotArchived(message: string): void {
    if (this._status === 'archived') {
      throw new ValidationError(message);
    }
  }
}
