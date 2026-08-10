import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';

export type MembershipRole = 'owner' | 'teacher' | 'assistant' | 'parent';
export type MembershipStatus = 'active' | 'suspended' | 'removed';

export interface InstituteMembershipEntityProps {
  id: string;
  userId: string;
  instituteId: string;
  role: MembershipRole;
  status: MembershipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInstituteMembershipProps {
  id?: string;
  userId: string;
  instituteId: string;
  role: MembershipRole;
  status?: MembershipStatus;
}

const VALID_ROLES: MembershipRole[] = ['owner', 'teacher', 'assistant', 'parent'];
const VALID_STATUSES: MembershipStatus[] = ['active', 'suspended', 'removed'];

export class InstituteMembershipEntity {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _instituteId: string;
  private _role: MembershipRole;
  private _status: MembershipStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: InstituteMembershipEntityProps) {
    this.validateProps(props);

    this._id = props.id;
    this._userId = props.userId.trim();
    this._instituteId = props.instituteId.trim();
    this._role = props.role;
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public static create(props: CreateInstituteMembershipProps): InstituteMembershipEntity {
    const trimmedUserId = props.userId ? props.userId.trim() : '';
    if (!trimmedUserId) {
      throw new ValidationError('User ID cannot be empty');
    }

    const trimmedInstituteId = props.instituteId ? props.instituteId.trim() : '';
    if (!trimmedInstituteId) {
      throw new ValidationError('Institute ID cannot be empty');
    }

    if (!VALID_ROLES.includes(props.role)) {
      throw new ValidationError(`Invalid MembershipRole: ${props.role}`);
    }

    const status = props.status || 'active';
    if (!VALID_STATUSES.includes(status)) {
      throw new ValidationError(`Invalid MembershipStatus: ${status}`);
    }

    const now = new Date();
    return new InstituteMembershipEntity({
      id: props.id || crypto.randomUUID(),
      userId: trimmedUserId,
      instituteId: trimmedInstituteId,
      role: props.role,
      status,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static from(props: InstituteMembershipEntityProps): InstituteMembershipEntity {
    return new InstituteMembershipEntity(props);
  }

  private validateProps(props: InstituteMembershipEntityProps): void {
    if (!props.id || !props.id.trim()) {
      throw new ValidationError('Membership ID cannot be empty');
    }
    if (!props.userId || !props.userId.trim()) {
      throw new ValidationError('User ID cannot be empty');
    }
    if (!props.instituteId || !props.instituteId.trim()) {
      throw new ValidationError('Institute ID cannot be empty');
    }
    if (!VALID_ROLES.includes(props.role)) {
      throw new ValidationError(`Invalid MembershipRole: ${props.role}`);
    }
    if (!VALID_STATUSES.includes(props.status)) {
      throw new ValidationError(`Invalid MembershipStatus: ${props.status}`);
    }
  }

  // Getters
  public get id(): string {
    return this._id;
  }
  public get userId(): string {
    return this._userId;
  }
  public get instituteId(): string {
    return this._instituteId;
  }
  public get role(): MembershipRole {
    return this._role;
  }
  public get status(): MembershipStatus {
    return this._status;
  }
  public get createdAt(): Date {
    return this._createdAt;
  }
  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public get isActive(): boolean {
    return this._status === 'active';
  }

  // Business Mutations
  public suspend(): void {
    if (this._status === 'removed') {
      throw new ValidationError('Cannot suspend a removed membership');
    }
    if (this._status === 'suspended') {
      return;
    }
    this._status = 'suspended';
    this._updatedAt = new Date();
  }

  public activate(): void {
    if (this._status === 'removed') {
      throw new ValidationError('Cannot activate a removed membership');
    }
    if (this._status === 'active') {
      return;
    }
    this._status = 'active';
    this._updatedAt = new Date();
  }

  public remove(): void {
    if (this._status === 'removed') {
      return;
    }
    this._status = 'removed';
    this._updatedAt = new Date();
  }

  public updateRole(newRole: MembershipRole): void {
    if (!VALID_ROLES.includes(newRole)) {
      throw new ValidationError(`Invalid MembershipRole: ${newRole}`);
    }
    if (this._status === 'removed') {
      throw new ValidationError('Cannot update role of a removed membership');
    }
    if (this._role === newRole) {
      return;
    }
    this._role = newRole;
    this._updatedAt = new Date();
  }

  public toJSON(): InstituteMembershipEntityProps {
    return {
      id: this._id,
      userId: this._userId,
      instituteId: this._instituteId,
      role: this._role,
      status: this._status,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
