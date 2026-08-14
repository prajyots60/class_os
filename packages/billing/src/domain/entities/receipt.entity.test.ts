import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { ReceiptEntity } from './receipt.entity';

describe('ReceiptEntity', () => {
  const validProps = {
    instituteId: 'inst-123',
    paymentId: 'pay-456',
    receiptNumber: 'REC-2026-00001',
  };

  it('should successfully create a ReceiptEntity with mandatory fields', () => {
    const receipt = ReceiptEntity.create(validProps);

    expect(receipt.id).toBeDefined();
    expect(receipt.instituteId).toBe('inst-123');
    expect(receipt.paymentId).toBe('pay-456');
    expect(receipt.receiptNumber).toBe('REC-2026-00001');
    expect(receipt.generatedAt).toBeInstanceOf(Date);
  });

  it('should reconstitute a ReceiptEntity from stored database values', () => {
    const now = new Date('2026-08-14T10:00:00.000Z');
    const receipt = ReceiptEntity.reconstitute({
      id: 'rcpt-789',
      instituteId: 'inst-123',
      paymentId: 'pay-456',
      receiptNumber: 'REC-2026-00001',
      generatedAt: now,
    });

    expect(receipt.id).toBe('rcpt-789');
    expect(receipt.instituteId).toBe('inst-123');
    expect(receipt.paymentId).toBe('pay-456');
    expect(receipt.receiptNumber).toBe('REC-2026-00001');
    expect(receipt.generatedAt.toISOString()).toBe(now.toISOString());
  });

  it('should throw ValidationError if instituteId is missing or empty', () => {
    expect(() => ReceiptEntity.create({ ...validProps, instituteId: '' })).toThrow(
      ValidationError
    );
  });

  it('should throw ValidationError if paymentId is missing or empty', () => {
    expect(() => ReceiptEntity.create({ ...validProps, paymentId: '   ' })).toThrow(
      ValidationError
    );
  });

  it('should throw ValidationError if receiptNumber is missing or empty', () => {
    expect(() => ReceiptEntity.create({ ...validProps, receiptNumber: '' })).toThrow(
      ValidationError
    );
  });

  it('should enforce 100% field immutability and encapsulate Date instances', () => {
    const receipt = ReceiptEntity.create(validProps);
    const date1 = receipt.generatedAt;
    date1.setFullYear(2099);

    // Internal date must remain unmodified
    expect(receipt.generatedAt.getFullYear()).not.toBe(2099);
  });
});
