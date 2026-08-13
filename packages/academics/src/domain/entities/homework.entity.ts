import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';

export interface HomeworkProps {
  id: string;
  instituteId: string;
  batchId: string;
  title: string;
  description?: string | null;
  attachmentUrl?: string | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHomeworkProps {
  id?: string;
  instituteId: string;
  batchId: string;
  title: string;
  description?: string | null;
  attachmentUrl?: string | null;
}

export interface HomeworkDTO {
  id: string;
  instituteId: string;
  batchId: string;
  title: string;
  description: string | null;
  attachmentUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Homework Domain Entity
 *
 * Represents a batch-targeted homework assignment.
 *
 * INVARIANTS:
 * - HOMEWORK-001: Homework belongs strictly to a Batch (`batchId`).
 * - ACADEMIC-006: Tenant-scoped by `instituteId`.
 * - Draft vs Published: `publishedAt === null` means DRAFT; `publishedAt !== null` means PUBLISHED.
 * - Publication Immutability: Published homework details (`title`, `description`, `attachmentUrl`) cannot be mutated silently.
 */
export class HomeworkEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private readonly _batchId: string;
  private _title: string;
  private _description: string | null;
  private _attachmentUrl: string | null;
  private _publishedAt: Date | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: HomeworkProps) {
    this.validateId(props.id, 'Homework ID');
    this.validateId(props.instituteId, 'Institute ID');
    this.validateId(props.batchId, 'Batch ID');
    const validatedTitle = this.validateTitle(props.title);

    this._id = props.id.trim();
    this._instituteId = props.instituteId.trim();
    this._batchId = props.batchId.trim();
    this._title = validatedTitle;
    this._description = props.description ? props.description.trim() || null : null;
    this._attachmentUrl = props.attachmentUrl ? props.attachmentUrl.trim() || null : null;
    this._publishedAt = props.publishedAt || null;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  private validateId(val: string, name: string): void {
    if (!val || typeof val !== 'string' || val.trim() === '') {
      throw new ValidationError(`${name} cannot be empty`);
    }
  }

  private validateTitle(val: string): string {
    if (!val || typeof val !== 'string' || val.trim() === '') {
      throw new ValidationError('Homework title cannot be empty');
    }
    const trimmed = val.trim();
    if (trimmed.length > 255) {
      throw new ValidationError('Homework title cannot exceed 255 characters');
    }
    return trimmed;
  }

  public static create(props: CreateHomeworkProps): HomeworkEntity {
    const now = new Date();
    return new HomeworkEntity({
      id: props.id || crypto.randomUUID(),
      instituteId: props.instituteId,
      batchId: props.batchId,
      title: props.title,
      description: props.description,
      attachmentUrl: props.attachmentUrl,
      publishedAt: null, // Always created as DRAFT
      createdAt: now,
      updatedAt: now,
    });
  }

  public static from(props: HomeworkProps): HomeworkEntity {
    return new HomeworkEntity(props);
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  public get id(): string {
    return this._id;
  }

  public get instituteId(): string {
    return this._instituteId;
  }

  public get batchId(): string {
    return this._batchId;
  }

  public get title(): string {
    return this._title;
  }

  public get description(): string | null {
    return this._description;
  }

  public get attachmentUrl(): string | null {
    return this._attachmentUrl;
  }

  public get publishedAt(): Date | null {
    return this._publishedAt ? new Date(this._publishedAt.getTime()) : null;
  }

  public get isPublished(): boolean {
    return this._publishedAt !== null;
  }

  public get isDraft(): boolean {
    return this._publishedAt === null;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  // ── State Mutators ─────────────────────────────────────────────────────────

  public updateDetails(props: {
    title?: string;
    description?: string | null;
    attachmentUrl?: string | null;
  }): void {
    if (this.isPublished) {
      throw new ValidationError('Cannot update published homework. Published homework is immutable.');
    }

    if (props.title !== undefined) {
      this._title = this.validateTitle(props.title);
    }

    if (props.description !== undefined) {
      this._description = props.description ? props.description.trim() || null : null;
    }

    if (props.attachmentUrl !== undefined) {
      this._attachmentUrl = props.attachmentUrl ? props.attachmentUrl.trim() || null : null;
    }

    this._updatedAt = new Date();
  }

  public publish(publishedAt?: Date): void {
    if (this.isPublished) {
      return; // Idempotent: already published
    }

    this._publishedAt = publishedAt || new Date();
    this._updatedAt = new Date();
  }

  public toDTO(): HomeworkDTO {
    return {
      id: this._id,
      instituteId: this._instituteId,
      batchId: this._batchId,
      title: this._title,
      description: this._description,
      attachmentUrl: this._attachmentUrl,
      isPublished: this.isPublished,
      publishedAt: this._publishedAt ? this._publishedAt.toISOString() : null,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
