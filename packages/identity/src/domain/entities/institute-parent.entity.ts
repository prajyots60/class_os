import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';

export type InstituteParentStatus = 'active' | 'inactive';

export interface InstituteParentProps {
  id: string;
  instituteId: string;
  parentIdentityId: string;
  notes?: string | null;
  status: InstituteParentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInstituteParentProps {
  id?: string;
  instituteId: string;
  parentIdentityId: string;
  notes?: string | null;
  status?: InstituteParentStatus;
}

/**
 * InstituteParent Domain Entity
 *
 * Tenant-scoped CRM representation of a parent within a specific coaching institute.
 *
 * ARCHITECTURAL CONTRACT:
 * - Framework-independent, zero database or HTTP framework dependencies.
 * - Owned strictly by an Institute (`instituteId`).
 * - References global identity via `parentIdentityId`.
 * - Manages tenant-local standing (`active` | `inactive`) independently of global ParentIdentity status.
 * - MUST NOT contain global parent identity properties (phone, global name, global avatar).
 */
export class InstituteParentEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private readonly _parentIdentityId: string;
  private _notes: string | null;
  private _status: InstituteParentStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: InstituteParentProps) {
    if (!props.id || typeof props.id !== 'string' || props.id.trim() === '') {
      throw new ValidationError('Institute parent ID cannot be empty');
    }

    if (!props.instituteId || typeof props.instituteId !== 'string' || props.instituteId.trim() === '') {
      throw new ValidationError('Institute ID cannot be empty');
    }

    if (!props.parentIdentityId || typeof props.parentIdentityId !== 'string' || props.parentIdentityId.trim() === '') {
      throw new ValidationError('Parent identity ID cannot be empty');
    }

    if (props.status !== 'active' && props.status !== 'inactive') {
      throw new ValidationError(`Invalid institute parent status: ${props.status}`);
    }

    this._id = props.id.trim();
    this._instituteId = props.instituteId.trim();
    this._parentIdentityId = props.parentIdentityId.trim();
    this._notes = props.notes ? props.notes.trim() || null : null;
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Factory method to create a new InstituteParent CRM record.
   */
  public static create(props: CreateInstituteParentProps): InstituteParentEntity {
    const now = new Date();
    return new InstituteParentEntity({
      id: props.id || crypto.randomUUID(),
      instituteId: props.instituteId,
      parentIdentityId: props.parentIdentityId,
      notes: props.notes,
      status: props.status || 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute an InstituteParent entity from persistence layer.
   */
  public static from(props: InstituteParentProps): InstituteParentEntity {
    return new InstituteParentEntity(props);
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  public get id(): string {
    return this._id;
  }

  public get instituteId(): string {
    return this._instituteId;
  }

  public get parentIdentityId(): string {
    return this._parentIdentityId;
  }

  public get notes(): string | null {
    return this._notes;
  }

  public get status(): InstituteParentStatus {
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
   * Updates institute-specific staff CRM notes.
   */
  public updateNotes(notes: string | null): void {
    const trimmedNotes = notes ? notes.trim() || null : null;
    if (this._notes !== trimmedNotes) {
      this._notes = trimmedNotes;
      this._updatedAt = new Date();
    }
  }

  /**
   * Transition tenant-local lifecycle state (`active` <-> `inactive`).
   */
  public changeStatus(newStatus: InstituteParentStatus): void {
    if (newStatus !== 'active' && newStatus !== 'inactive') {
      throw new ValidationError(`Invalid institute parent status transition: ${newStatus}`);
    }

    if (this._status === newStatus) {
      return;
    }

    this._status = newStatus;
    this._updatedAt = new Date();
  }

  public inactivate(): void {
    this.changeStatus('inactive');
  }

  public activate(): void {
    this.changeStatus('active');
  }

  /**
   * Export domain state for DTO serialization.
   */
  public toDTO() {
    return {
      id: this._id,
      instituteId: this._instituteId,
      parentIdentityId: this._parentIdentityId,
      notes: this._notes,
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
