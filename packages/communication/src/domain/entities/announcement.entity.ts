import { ValidationError } from '@coaching-os/shared';
import type { AnnouncementStatus, AnnouncementTargetType } from '../types';

export interface AnnouncementEntityProps {
  id: string;
  instituteId: string;
  targetType: AnnouncementTargetType;
  targetBatchId?: string | null;
  title: string;
  content: string;
  publishedAt?: Date | null;
  isArchived?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AnnouncementEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private _targetType: AnnouncementTargetType;
  private _targetBatchId: string | null;
  private _title: string;
  private _content: string;
  private _publishedAt: Date | null;
  private _isArchived: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: AnnouncementEntityProps) {
    this._id = props.id;
    this._instituteId = props.instituteId;
    this._targetType = props.targetType;
    this._targetBatchId = props.targetBatchId ?? null;
    this._title = props.title;
    this._content = props.content;
    this._publishedAt = props.publishedAt ?? null;
    this._isArchived = props.isArchived ?? false;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();

    this.validateInvariants();
  }

  public static create(props: AnnouncementEntityProps): AnnouncementEntity {
    return new AnnouncementEntity(props);
  }

  private validateInvariants(): void {
    if (!this._id || this._id.trim().length === 0) {
      throw new ValidationError('Announcement ID cannot be empty');
    }

    if (!this._instituteId || this._instituteId.trim().length === 0) {
      throw new ValidationError('Institute ID cannot be empty');
    }

    if (this._targetType !== 'institute' && this._targetType !== 'batch') {
      throw new ValidationError('Target type must be either "institute" or "batch"');
    }

    if (this._targetType === 'institute' && this._targetBatchId !== null) {
      throw new ValidationError('Institute-wide announcement cannot have a target batch ID');
    }

    if (this._targetType === 'batch' && (!this._targetBatchId || this._targetBatchId.trim().length === 0)) {
      throw new ValidationError('Batch-targeted announcement must specify a valid batch ID');
    }

    const trimmedTitle = this._title ? this._title.trim() : '';
    if (trimmedTitle.length === 0 || trimmedTitle.length > 200) {
      throw new ValidationError('Announcement title must be between 1 and 200 characters');
    }

    const trimmedContent = this._content ? this._content.trim() : '';
    if (trimmedContent.length === 0 || trimmedContent.length > 5000) {
      throw new ValidationError('Announcement content must be between 1 and 5000 characters');
    }
  }

  // Getters
  public get id(): string {
    return this._id;
  }

  public get instituteId(): string {
    return this._instituteId;
  }

  public get targetType(): AnnouncementTargetType {
    return this._targetType;
  }

  public get targetBatchId(): string | null {
    return this._targetBatchId;
  }

  public get title(): string {
    return this._title;
  }

  public get content(): string {
    return this._content;
  }

  public get publishedAt(): Date | null {
    return this._publishedAt;
  }

  public get isArchived(): boolean {
    return this._isArchived;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public get status(): AnnouncementStatus {
    if (this._isArchived) {
      return 'archived';
    }
    if (this._publishedAt !== null) {
      return 'published';
    }
    return 'draft';
  }

  public get isDraft(): boolean {
    return this.status === 'draft';
  }

  public get isPublished(): boolean {
    return this.status === 'published';
  }

  public get isArchivedState(): boolean {
    return this.status === 'archived';
  }

  // Domain Lifecycle Mutations
  public publish(now: Date = new Date()): void {
    if (this._isArchived) {
      throw new ValidationError('Cannot publish an archived announcement');
    }
    if (this._publishedAt !== null) {
      throw new ValidationError('Announcement is already published');
    }

    this._publishedAt = now;
    this._updatedAt = now;
  }

  public archive(now: Date = new Date()): void {
    if (this._isArchived) {
      throw new ValidationError('Announcement is already archived');
    }
    if (this._publishedAt === null) {
      throw new ValidationError('Only published announcements can be archived');
    }

    this._isArchived = true;
    this._updatedAt = now;
  }

  public updateDraft(props: {
    title?: string;
    content?: string;
    targetType?: AnnouncementTargetType;
    targetBatchId?: string | null;
  }): void {
    if (this.status !== 'draft') {
      throw new ValidationError('Published and archived announcements are immutable and cannot be updated');
    }

    if (props.title !== undefined) {
      this._title = props.title;
    }
    if (props.content !== undefined) {
      this._content = props.content;
    }
    if (props.targetType !== undefined) {
      this._targetType = props.targetType;
    }
    if (props.targetBatchId !== undefined) {
      this._targetBatchId = props.targetBatchId;
    }

    this._updatedAt = new Date();
    this.validateInvariants();
  }
}
