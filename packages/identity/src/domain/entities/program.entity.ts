import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { ProgramCode } from '../value-objects/program-code.vo';

export type ProgramStatus = 'draft' | 'active' | 'archived';

export interface ProgramProps {
  id: string;
  instituteId: string;
  name: string;
  code: ProgramCode | string;
  description?: string | null;
  status: ProgramStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateProgramProps {
  id?: string;
  instituteId: string;
  name: string;
  code: ProgramCode | string;
  description?: string | null;
  status?: ProgramStatus;
}

export interface ProgramDTO {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  description: string | null;
  status: ProgramStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Program Domain Entity
 *
 * Represents an institute-defined course offering or category (e.g., JEE 2027, NEET 2027).
 * Strictly tenant-scoped by `instituteId`.
 */
export class ProgramEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private _name: string;
  private readonly _code: ProgramCode;
  private _description: string | null;
  private _status: ProgramStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt: Date | null;

  private constructor(props: ProgramProps) {
    if (!props.id || typeof props.id !== 'string' || props.id.trim() === '') {
      throw new ValidationError('Program ID cannot be empty');
    }

    if (!props.instituteId || typeof props.instituteId !== 'string' || props.instituteId.trim() === '') {
      throw new ValidationError('Institute ID cannot be empty');
    }

    const normalizedName = ProgramEntity.validateName(props.name);
    const validatedCode = ProgramCode.create(props.code);
    const validatedStatus = ProgramEntity.validateStatus(props.status);

    this._id = props.id.trim();
    this._instituteId = props.instituteId.trim();
    this._name = normalizedName;
    this._code = validatedCode;
    this._description = props.description ? props.description.trim() || null : null;
    this._status = validatedStatus;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._deletedAt = props.deletedAt || null;
  }

  public static create(props: CreateProgramProps): ProgramEntity {
    const now = new Date();
    return new ProgramEntity({
      id: props.id || crypto.randomUUID(),
      instituteId: props.instituteId,
      name: props.name,
      code: props.code,
      description: props.description,
      status: props.status || 'draft',
      createdAt: now,
      updatedAt: now,
    });
  }

  public static from(props: ProgramProps): ProgramEntity {
    return new ProgramEntity(props);
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  public get id(): string {
    return this._id;
  }

  public get instituteId(): string {
    return this._instituteId;
  }

  public get name(): string {
    return this._name;
  }

  public get code(): ProgramCode {
    return this._code;
  }

  public get description(): string | null {
    return this._description;
  }

  public get status(): ProgramStatus {
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

  // ── State Mutators ─────────────────────────────────────────────────────────

  public updateProfile(props: { name?: string; description?: string | null }): void {
    if (this._status === 'archived') {
      throw new ValidationError('Cannot update an archived program');
    }

    let changed = false;

    if (props.name !== undefined) {
      const nameVal = ProgramEntity.validateName(props.name);
      if (this._name !== nameVal) {
        this._name = nameVal;
        changed = true;
      }
    }

    if (props.description !== undefined) {
      const descVal = props.description ? props.description.trim() || null : null;
      if (this._description !== descVal) {
        this._description = descVal;
        changed = true;
      }
    }

    if (changed) {
      this._updatedAt = new Date();
    }
  }

  /**
   * Transition state to "active". Rejects if status is already archived or active.
   */
  public activate(): void {
    if (this._status === 'archived') {
      throw new ValidationError('Cannot activate an archived program');
    }
    if (this._status === 'active') return;

    this._status = 'active';
    this._updatedAt = new Date();
  }

  /**
   * Transition state to "archived". Rejects if already archived.
   */
  public archive(): void {
    if (this._status === 'archived') return;

    const now = new Date();
    this._status = 'archived';
    this._deletedAt = now;
    this._updatedAt = now;
  }

  public toDTO(): ProgramDTO {
    return {
      id: this._id,
      instituteId: this._instituteId,
      name: this._name,
      code: this._code.value,
      description: this._description,
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      deletedAt: this._deletedAt ? this._deletedAt.toISOString() : null,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private static validateName(name: string): string {
    if (!name || typeof name !== 'string') {
      throw new ValidationError('Program name cannot be empty');
    }
    const trimmed = name.trim();
    if (trimmed === '') {
      throw new ValidationError('Program name cannot be empty');
    }
    if (trimmed.length > 100) {
      throw new ValidationError('Program name cannot exceed 100 characters');
    }
    return trimmed;
  }

  private static validateStatus(status: string): ProgramStatus {
    const validStatuses: ProgramStatus[] = ['draft', 'active', 'archived'];
    if (!status || !validStatuses.includes(status as ProgramStatus)) {
      throw new ValidationError(`Invalid program status: "${status}"`);
    }
    return status as ProgramStatus;
  }
}
