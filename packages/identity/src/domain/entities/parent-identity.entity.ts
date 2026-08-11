import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { PhoneNumber } from '../value-objects/phone-number.vo';

export type ParentIdentityStatus = 'active' | 'suspended' | 'deactivated';

export interface ParentIdentityProps {
  id: string;
  phone: PhoneNumber | string;
  name?: string | null;
  avatar?: string | null;
  status: ParentIdentityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateParentIdentityProps {
  id?: string;
  phone: PhoneNumber | string;
  name?: string | null;
  avatar?: string | null;
}

export interface UpdateParentIdentityProfileProps {
  name?: string | null;
  avatar?: string | null;
}

/**
 * ParentIdentity Domain Entity
 *
 * Represents the global platform identity of a real-world parent across CoachingOS.
 *
 * ARCHITECTURAL CONTRACT:
 * - Framework-independent, zero database or framework dependencies.
 * - Anchored globally by unique canonical E.164 phone number.
 * - Manages lifecycle state transitions (active <-> suspended -> deactivated).
 * - MUST NOT contain tenant identifiers (e.g. instituteId), student references,
 *   or CRM operational fields.
 */
export class ParentIdentityEntity {
  private readonly _id: string;
  private readonly _phone: PhoneNumber;
  private _name: string | null;
  private _avatar: string | null;
  private _status: ParentIdentityStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: ParentIdentityProps) {
    if (!props.id || typeof props.id !== 'string' || props.id.trim() === '') {
      throw new ValidationError('Parent identity ID cannot be empty');
    }

    this._id = props.id.trim();
    this._phone = PhoneNumber.create(props.phone);
    this._name = props.name ? props.name.trim() || null : null;
    this._avatar = props.avatar ? props.avatar.trim() || null : null;
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Factory method to create a new active ParentIdentity instance.
   */
  public static create(props: CreateParentIdentityProps): ParentIdentityEntity {
    const now = new Date();
    return new ParentIdentityEntity({
      id: props.id || crypto.randomUUID(),
      phone: props.phone,
      name: props.name,
      avatar: props.avatar,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute a ParentIdentity entity from persistence layer.
   */
  public static from(props: ParentIdentityProps): ParentIdentityEntity {
    return new ParentIdentityEntity(props);
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  public get id(): string {
    return this._id;
  }

  public get phone(): PhoneNumber {
    return this._phone;
  }

  public get phoneValue(): string {
    return this._phone.value;
  }

  public get name(): string | null {
    return this._name;
  }

  public get avatar(): string | null {
    return this._avatar;
  }

  public get status(): ParentIdentityStatus {
    return this._status;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  // ── Domain Invariants & State Mutators ──────────────────────────────────────

  /**
   * Updates global profile attributes (name, avatar).
   */
  public updateProfile(props: UpdateParentIdentityProfileProps): void {
    if (this._status === 'deactivated') {
      throw new ValidationError('Cannot update profile of a deactivated parent identity');
    }

    let modified = false;

    if (props.name !== undefined) {
      const trimmedName = props.name ? props.name.trim() || null : null;
      if (this._name !== trimmedName) {
        this._name = trimmedName;
        modified = true;
      }
    }

    if (props.avatar !== undefined) {
      const trimmedAvatar = props.avatar ? props.avatar.trim() || null : null;
      if (this._avatar !== trimmedAvatar) {
        this._avatar = trimmedAvatar;
        modified = true;
      }
    }

    if (modified) {
      this._updatedAt = new Date();
    }
  }

  /**
   * Transition lifecycle state following strict state machine rules.
   *
   * Valid Transitions:
   * - active -> suspended
   * - suspended -> active
   * - active -> deactivated (terminal)
   * - suspended -> deactivated (terminal)
   *
   * Invalid Transitions:
   * - deactivated -> active / suspended (Terminal state violation)
   */
  public changeStatus(newStatus: ParentIdentityStatus): void {
    if (this._status === newStatus) {
      return;
    }

    if (this._status === 'deactivated') {
      throw new ValidationError(
        'Invalid status transition: Deactivated parent identity is in a terminal state and cannot be reactivated or modified.',
      );
    }

    this._status = newStatus;
    this._updatedAt = new Date();
  }

  /**
   * Export domain state for DTO serialization.
   */
  public toDTO() {
    return {
      id: this._id,
      phone: this._phone.value,
      name: this._name,
      avatar: this._avatar,
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
