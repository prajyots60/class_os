import { ValidationError } from '@coaching-os/shared';

export type OutboundMessageStatus = 'pending' | 'processing' | 'sent' | 'failed';
export type OutboundChannel = 'whatsapp' | 'email' | 'sms';

export interface OutboundMessageProps {
  id: string;
  instituteId: string;
  notificationId?: string | null;
  recipientUserId: string;
  recipientPhone: string;
  channel?: OutboundChannel;
  templateName: string;
  templateVariables?: Record<string, unknown> | null;
  status?: OutboundMessageStatus;
  attempts?: number;
  maxAttempts?: number;
  lastError?: string | null;
  idempotencyKey?: string | null;
  availableAt?: Date;
  sentAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OutboundMessageDTO {
  id: string;
  instituteId: string;
  notificationId: string | null;
  recipientUserId: string;
  recipientPhone: string;
  maskedPhone: string;
  channel: OutboundChannel;
  templateName: string;
  templateVariables: Record<string, unknown> | null;
  status: OutboundMessageStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  idempotencyKey: string | null;
  availableAt: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 7) return '***';
  const prefix = phone.slice(0, 5);
  const suffix = phone.slice(-2);
  return `${prefix}****${suffix}`;
}

export class OutboundMessageEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private readonly _notificationId: string | null;
  private readonly _recipientUserId: string;
  private readonly _recipientPhone: string;
  private readonly _channel: OutboundChannel;
  private readonly _templateName: string;
  private readonly _templateVariables: Record<string, unknown> | null;
  private _status: OutboundMessageStatus;
  private _attempts: number;
  private readonly _maxAttempts: number;
  private _lastError: string | null;
  private readonly _idempotencyKey: string | null;
  private _availableAt: Date;
  private _sentAt: Date | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: OutboundMessageProps) {
    this._id = props.id;
    this._instituteId = props.instituteId;
    this._notificationId = props.notificationId ?? null;
    this._recipientUserId = props.recipientUserId;
    this._recipientPhone = props.recipientPhone;
    this._channel = props.channel ?? 'whatsapp';
    this._templateName = props.templateName;
    this._templateVariables = props.templateVariables ? JSON.parse(JSON.stringify(props.templateVariables)) : null;
    this._status = props.status ?? 'pending';
    this._attempts = props.attempts ?? 0;
    this._maxAttempts = props.maxAttempts ?? 3;
    this._lastError = props.lastError ?? null;
    this._idempotencyKey = props.idempotencyKey ?? null;
    this._availableAt = props.availableAt ?? new Date();
    this._sentAt = props.sentAt ?? null;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  public static create(props: OutboundMessageProps): OutboundMessageEntity {
    if (!props.id || props.id.trim() === '') {
      throw new ValidationError('Outbound message ID cannot be empty');
    }
    if (!props.instituteId || props.instituteId.trim() === '') {
      throw new ValidationError('Institute ID cannot be empty');
    }
    if (!props.recipientUserId || props.recipientUserId.trim() === '') {
      throw new ValidationError('Recipient User ID cannot be empty');
    }
    if (!props.recipientPhone || props.recipientPhone.trim() === '') {
      throw new ValidationError('Recipient Phone cannot be empty');
    }
    if (!props.templateName || props.templateName.trim() === '') {
      throw new ValidationError('Template Name cannot be empty');
    }
    if (props.maxAttempts !== undefined && props.maxAttempts <= 0) {
      throw new ValidationError('Max attempts must be greater than zero');
    }

    return new OutboundMessageEntity(props);
  }

  public get id(): string { return this._id; }
  public get instituteId(): string { return this._instituteId; }
  public get notificationId(): string | null { return this._notificationId; }
  public get recipientUserId(): string { return this._recipientUserId; }
  public get recipientPhone(): string { return this._recipientPhone; }
  public get channel(): OutboundChannel { return this._channel; }
  public get templateName(): string { return this._templateName; }
  public get templateVariables(): Record<string, unknown> | null {
    return this._templateVariables ? JSON.parse(JSON.stringify(this._templateVariables)) : null;
  }
  public get status(): OutboundMessageStatus { return this._status; }
  public get attempts(): number { return this._attempts; }
  public get maxAttempts(): number { return this._maxAttempts; }
  public get lastError(): string | null { return this._lastError; }
  public get idempotencyKey(): string | null { return this._idempotencyKey; }
  public get availableAt(): Date { return new Date(this._availableAt); }
  public get sentAt(): Date | null { return this._sentAt ? new Date(this._sentAt) : null; }
  public get createdAt(): Date { return new Date(this._createdAt); }
  public get updatedAt(): Date { return new Date(this._updatedAt); }

  public markProcessing(): void {
    if (this._status !== 'pending' && this._status !== 'processing') {
      throw new ValidationError(`Cannot transition outbound message from ${this._status} to processing`);
    }
    this._status = 'processing';
    this._updatedAt = new Date();
  }

  public markSent(sentAt: Date = new Date()): void {
    if (this._status !== 'processing' && this._status !== 'pending') {
      throw new ValidationError(`Cannot transition outbound message from ${this._status} to sent`);
    }
    this._status = 'sent';
    this._sentAt = sentAt;
    this._lastError = null;
    this._updatedAt = new Date();
  }

  public recordFailure(error: string, isRetryable: boolean = true, retryDelayMs: number = 5000): void {
    this._attempts += 1;
    this._lastError = error ? error.slice(0, 1000) : 'Unknown delivery error';
    this._updatedAt = new Date();

    if (!isRetryable || this._attempts >= this._maxAttempts) {
      this._status = 'failed';
    } else {
      this._status = 'pending';
      this._availableAt = new Date(Date.now() + retryDelayMs);
    }
  }

  public toDTO(): OutboundMessageDTO {
    return {
      id: this._id,
      instituteId: this._instituteId,
      notificationId: this._notificationId,
      recipientUserId: this._recipientUserId,
      recipientPhone: this._recipientPhone,
      maskedPhone: maskPhoneNumber(this._recipientPhone),
      channel: this._channel,
      templateName: this._templateName,
      templateVariables: this._templateVariables ? JSON.parse(JSON.stringify(this._templateVariables)) : null,
      status: this._status,
      attempts: this._attempts,
      maxAttempts: this._maxAttempts,
      lastError: this._lastError,
      idempotencyKey: this._idempotencyKey,
      availableAt: this._availableAt.toISOString(),
      sentAt: this._sentAt ? this._sentAt.toISOString() : null,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
