import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { OutboundMessageEntity, maskPhoneNumber } from './outbound-message.entity';

describe('OutboundMessageEntity Unit Tests', () => {
  const validProps = {
    id: crypto.randomUUID(),
    instituteId: crypto.randomUUID(),
    recipientUserId: crypto.randomUUID(),
    recipientPhone: '+919876543210',
    templateName: 'attendance_absent_alert',
    templateVariables: { studentName: 'John' },
  };

  it('should construct a valid OutboundMessageEntity in pending state', () => {
    const msg = OutboundMessageEntity.create(validProps);
    expect(msg.id).toBe(validProps.id);
    expect(msg.status).toBe('pending');
    expect(msg.attempts).toBe(0);
    expect(msg.maxAttempts).toBe(3);
    expect(msg.templateName).toBe('attendance_absent_alert');
  });

  it('should mask phone numbers correctly', () => {
    expect(maskPhoneNumber('+919876543210')).toBe('+9198****10');
    expect(maskPhoneNumber('123')).toBe('***');
  });

  it('should handle state transitions cleanly', () => {
    const msg = OutboundMessageEntity.create(validProps);
    msg.markProcessing();
    expect(msg.status).toBe('processing');

    msg.markSent();
    expect(msg.status).toBe('sent');
    expect(msg.sentAt).not.toBeNull();
  });

  it('should record retryable failure and increment attempts', () => {
    const msg = OutboundMessageEntity.create(validProps);
    msg.markProcessing();
    msg.recordFailure('Network timeout', true, 5000);

    expect(msg.attempts).toBe(1);
    expect(msg.status).toBe('pending');
    expect(msg.lastError).toBe('Network timeout');
  });

  it('should transition to failed status when maxAttempts reached', () => {
    const msg = OutboundMessageEntity.create({ ...validProps, attempts: 2, maxAttempts: 3 });
    msg.markProcessing();
    msg.recordFailure('Final failure', true);

    expect(msg.attempts).toBe(3);
    expect(msg.status).toBe('failed');
  });

  it('should transition to failed status immediately on non-retryable error', () => {
    const msg = OutboundMessageEntity.create(validProps);
    msg.markProcessing();
    msg.recordFailure('Invalid template', false);

    expect(msg.status).toBe('failed');
    expect(msg.attempts).toBe(1);
  });

  it('should reject invalid constructor arguments', () => {
    expect(() => OutboundMessageEntity.create({ ...validProps, id: '' })).toThrow(ValidationError);
    expect(() => OutboundMessageEntity.create({ ...validProps, recipientPhone: '' })).toThrow(ValidationError);
    expect(() => OutboundMessageEntity.create({ ...validProps, templateName: '' })).toThrow(ValidationError);
  });
});
