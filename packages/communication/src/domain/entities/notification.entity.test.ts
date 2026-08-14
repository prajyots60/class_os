import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { NotificationEntity } from './notification.entity';

describe('NotificationEntity Domain Aggregate Suite', () => {
  const validId = crypto.randomUUID();
  const validInstituteId = crypto.randomUUID();
  const validRecipientUserId = crypto.randomUUID();

  it('creates a valid notification entity with default values', () => {
    const entity = NotificationEntity.create({
      id: validId,
      instituteId: validInstituteId,
      recipientUserId: validRecipientUserId,
      recipientType: 'student',
      title: 'Tuition Fee Due',
      message: 'Your tuition fee for August is due tomorrow.',
    });

    expect(entity.id).toBe(validId);
    expect(entity.instituteId).toBe(validInstituteId);
    expect(entity.recipientUserId).toBe(validRecipientUserId);
    expect(entity.recipientType).toBe('student');
    expect(entity.priority).toBe('informational');
    expect(entity.category).toBe('general');
    expect(entity.channel).toBe('in_app');
    expect(entity.title).toBe('Tuition Fee Due');
    expect(entity.message).toBe('Your tuition fee for August is due tomorrow.');
    expect(entity.actionUrl).toBeNull();
    expect(entity.isRead).toBe(false);
    expect(entity.readAt).toBeNull();
    expect(entity.metadata).toBeNull();
    expect(entity.createdAt).toBeInstanceOf(Date);
  });

  it('creates a notification with explicit priority, category, actionUrl, and metadata', () => {
    const meta = { invoiceId: 'inv-123' };
    const entity = NotificationEntity.create({
      id: validId,
      instituteId: validInstituteId,
      recipientUserId: validRecipientUserId,
      recipientType: 'parent',
      priority: 'critical',
      category: 'fee',
      channel: 'in_app',
      title: 'Overdue Fee Notice',
      message: 'Immediate payment required.',
      actionUrl: '/billing/invoices/inv-123',
      metadata: meta,
    });

    expect(entity.priority).toBe('critical');
    expect(entity.category).toBe('fee');
    expect(entity.actionUrl).toBe('/billing/invoices/inv-123');
    expect(entity.metadata).toEqual(meta);

    // Verify defensive metadata copy
    meta.invoiceId = 'tampered';
    expect(entity.metadata?.invoiceId).toBe('inv-123');
  });

  it('idempotently marks notification as read', () => {
    const entity = NotificationEntity.create({
      id: validId,
      instituteId: validInstituteId,
      recipientUserId: validRecipientUserId,
      recipientType: 'staff',
      title: 'Staff Meeting',
      message: 'Meeting at 4 PM.',
    });

    expect(entity.isRead).toBe(false);
    expect(entity.readAt).toBeNull();

    const firstReadAt = new Date();
    entity.markAsRead(firstReadAt);

    expect(entity.isRead).toBe(true);
    expect(entity.readAt).toEqual(firstReadAt);

    // Second call to markAsRead with a later date must preserve the original firstReadAt
    const secondReadAt = new Date(firstReadAt.getTime() + 10000);
    entity.markAsRead(secondReadAt);

    expect(entity.isRead).toBe(true);
    expect(entity.readAt).toEqual(firstReadAt);
  });

  it('rejects markAsRead with timestamp earlier than createdAt', () => {
    const createdAt = new Date('2026-08-14T12:00:00Z');
    const entity = NotificationEntity.create({
      id: validId,
      instituteId: validInstituteId,
      recipientUserId: validRecipientUserId,
      recipientType: 'student',
      title: 'Title',
      message: 'Message',
      createdAt,
    });

    const earlierDate = new Date('2026-08-14T11:59:59Z');
    expect(() => entity.markAsRead(earlierDate)).toThrow(ValidationError);
  });

  it('rejects inconsistent read state (isRead false but readAt provided)', () => {
    expect(() =>
      NotificationEntity.reconstitute({
        id: validId,
        instituteId: validInstituteId,
        recipientUserId: validRecipientUserId,
        recipientType: 'student',
        title: 'Title',
        message: 'Message',
        isRead: false,
        readAt: new Date(),
      }),
    ).toThrow(ValidationError);
  });

  it('throws ValidationError for invalid input fields', () => {
    expect(() =>
      NotificationEntity.create({
        id: '',
        instituteId: validInstituteId,
        recipientUserId: validRecipientUserId,
        recipientType: 'student',
        title: 'Title',
        message: 'Message',
      }),
    ).toThrow(ValidationError);

    expect(() =>
      NotificationEntity.create({
        id: validId,
        instituteId: ' ',
        recipientUserId: validRecipientUserId,
        recipientType: 'student',
        title: 'Title',
        message: 'Message',
      }),
    ).toThrow(ValidationError);

    expect(() =>
      NotificationEntity.create({
        id: validId,
        instituteId: validInstituteId,
        recipientUserId: '',
        recipientType: 'student',
        title: 'Title',
        message: 'Message',
      }),
    ).toThrow(ValidationError);

    expect(() =>
      NotificationEntity.create({
        id: validId,
        instituteId: validInstituteId,
        recipientUserId: validRecipientUserId,
        recipientType: 'admin' as any,
        title: 'Title',
        message: 'Message',
      }),
    ).toThrow(ValidationError);

    expect(() =>
      NotificationEntity.create({
        id: validId,
        instituteId: validInstituteId,
        recipientUserId: validRecipientUserId,
        recipientType: 'student',
        priority: 'urgent' as any,
        title: 'Title',
        message: 'Message',
      }),
    ).toThrow(ValidationError);

    expect(() =>
      NotificationEntity.create({
        id: validId,
        instituteId: validInstituteId,
        recipientUserId: validRecipientUserId,
        recipientType: 'student',
        channel: 'whatsapp' as any,
        title: 'Title',
        message: 'Message',
      }),
    ).toThrow(ValidationError);

    expect(() =>
      NotificationEntity.create({
        id: validId,
        instituteId: validInstituteId,
        recipientUserId: validRecipientUserId,
        recipientType: 'student',
        title: 'A'.repeat(256),
        message: 'Message',
      }),
    ).toThrow(ValidationError);

    expect(() =>
      NotificationEntity.create({
        id: validId,
        instituteId: validInstituteId,
        recipientUserId: validRecipientUserId,
        recipientType: 'student',
        title: 'Title',
        message: 'A'.repeat(5001),
      }),
    ).toThrow(ValidationError);
  });

  it('guarantees defensive Date handling on createdAt and readAt', () => {
    const now = new Date();
    const entity = NotificationEntity.create({
      id: validId,
      instituteId: validInstituteId,
      recipientUserId: validRecipientUserId,
      recipientType: 'student',
      title: 'Title',
      message: 'Message',
      createdAt: now,
      isRead: true,
      readAt: now,
    });

    const returnedCreatedAt = entity.createdAt;
    returnedCreatedAt.setFullYear(2000);
    expect(entity.createdAt.getFullYear()).not.toBe(2000);

    const returnedReadAt = entity.readAt!;
    returnedReadAt.setFullYear(2000);
    expect(entity.readAt?.getFullYear()).not.toBe(2000);
  });
});
