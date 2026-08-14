import { ValidationError } from '@coaching-os/shared';
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationRecipientType,
} from '../types';

export interface NotificationProps {
  id: string;
  instituteId: string;
  recipientUserId: string;
  recipientType: NotificationRecipientType;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  channel?: NotificationChannel;
  title: string;
  message: string;
  actionUrl?: string | null;
  isRead?: boolean;
  readAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
}

const VALID_RECIPIENT_TYPES: ReadonlySet<NotificationRecipientType> = new Set([
  'staff',
  'parent',
  'student',
]);

const VALID_PRIORITIES: ReadonlySet<NotificationPriority> = new Set([
  'critical',
  'important',
  'informational',
]);

const VALID_CATEGORIES: ReadonlySet<NotificationCategory> = new Set([
  'attendance',
  'fee',
  'assessment',
  'homework',
  'announcement',
  'emergency',
  'general',
]);

export class NotificationEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private readonly _recipientUserId: string;
  private readonly _recipientType: NotificationRecipientType;
  private readonly _priority: NotificationPriority;
  private readonly _category: NotificationCategory;
  private readonly _channel: NotificationChannel;
  private readonly _title: string;
  private readonly _message: string;
  private readonly _actionUrl: string | null;
  private readonly _metadata: Record<string, unknown> | null;
  private readonly _createdAt: Date;

  private _isRead: boolean;
  private _readAt: Date | null;

  private constructor(props: NotificationProps) {
    this.validateProps(props);

    this._id = props.id;
    this._instituteId = props.instituteId;
    this._recipientUserId = props.recipientUserId;
    this._recipientType = props.recipientType;
    this._priority = props.priority ?? 'informational';
    this._category = props.category ?? 'general';
    this._channel = props.channel ?? 'in_app';
    this._title = props.title.trim();
    this._message = props.message.trim();
    this._actionUrl = props.actionUrl ? props.actionUrl.trim() : null;
    this._metadata = props.metadata ? { ...props.metadata } : null;
    this._createdAt = props.createdAt ? new Date(props.createdAt.getTime()) : new Date();

    this._isRead = props.isRead ?? false;
    this._readAt = props.readAt ? new Date(props.readAt.getTime()) : null;

    if (this._isRead && !this._readAt) {
      this._readAt = new Date();
    }
    if (!this._isRead && this._readAt) {
      throw new ValidationError('Inconsistent read state: readAt cannot be set when isRead is false');
    }
  }

  private validateProps(props: NotificationProps): void {
    if (!props.id || typeof props.id !== 'string' || props.id.trim() === '') {
      throw new ValidationError('Notification ID must be a non-empty string');
    }
    if (!props.instituteId || typeof props.instituteId !== 'string' || props.instituteId.trim() === '') {
      throw new ValidationError('Notification instituteId must be a non-empty string');
    }
    if (
      !props.recipientUserId ||
      typeof props.recipientUserId !== 'string' ||
      props.recipientUserId.trim() === ''
    ) {
      throw new ValidationError('Notification recipientUserId must be a non-empty string');
    }
    if (!VALID_RECIPIENT_TYPES.has(props.recipientType)) {
      throw new ValidationError(`Invalid notification recipientType: ${props.recipientType}`);
    }
    if (props.priority && !VALID_PRIORITIES.has(props.priority)) {
      throw new ValidationError(`Invalid notification priority: ${props.priority}`);
    }
    if (props.category && !VALID_CATEGORIES.has(props.category)) {
      throw new ValidationError(`Invalid notification category: ${props.category}`);
    }
    if (props.channel && props.channel !== 'in_app') {
      throw new ValidationError(`Unsupported notification channel for Phase 4.2: ${props.channel}`);
    }
    if (!props.title || typeof props.title !== 'string' || props.title.trim() === '') {
      throw new ValidationError('Notification title must be a non-empty string');
    }
    if (props.title.trim().length > 255) {
      throw new ValidationError('Notification title cannot exceed 255 characters');
    }
    if (!props.message || typeof props.message !== 'string' || props.message.trim() === '') {
      throw new ValidationError('Notification message must be a non-empty string');
    }
    if (props.message.trim().length > 5000) {
      throw new ValidationError('Notification message cannot exceed 5000 characters');
    }
  }

  public static create(props: NotificationProps): NotificationEntity {
    return new NotificationEntity(props);
  }

  public static reconstitute(props: NotificationProps): NotificationEntity {
    return new NotificationEntity(props);
  }

  // Getters
  public get id(): string {
    return this._id;
  }
  public get instituteId(): string {
    return this._instituteId;
  }
  public get recipientUserId(): string {
    return this._recipientUserId;
  }
  public get recipientType(): NotificationRecipientType {
    return this._recipientType;
  }
  public get priority(): NotificationPriority {
    return this._priority;
  }
  public get category(): NotificationCategory {
    return this._category;
  }
  public get channel(): NotificationChannel {
    return this._channel;
  }
  public get title(): string {
    return this._title;
  }
  public get message(): string {
    return this._message;
  }
  public get actionUrl(): string | null {
    return this._actionUrl;
  }
  public get isRead(): boolean {
    return this._isRead;
  }
  public get readAt(): Date | null {
    return this._readAt ? new Date(this._readAt.getTime()) : null;
  }
  public get metadata(): Record<string, unknown> | null {
    return this._metadata ? { ...this._metadata } : null;
  }
  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  /**
   * Idempotently marks notification as READ.
   */
  public markAsRead(readAt?: Date): void {
    if (this._isRead) {
      return; // Already read — idempotent no-op
    }

    const timestamp = readAt ? new Date(readAt.getTime()) : new Date();

    if (timestamp.getTime() < this._createdAt.getTime()) {
      throw new ValidationError('readAt timestamp cannot be earlier than createdAt timestamp');
    }

    this._isRead = true;
    this._readAt = timestamp;
  }
}
