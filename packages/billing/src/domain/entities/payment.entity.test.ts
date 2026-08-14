import { ValidationError } from '@coaching-os/shared';
import { describe, expect, it } from 'vitest';
import { PaymentEntity } from './payment.entity';

describe('PaymentEntity', () => {
  it('creates a valid PaymentEntity with default id and createdAt', () => {
    const payment = PaymentEntity.create({
      invoiceId: 'inv-123',
      amount: 5000.5,
      paymentMode: 'cash',
      receivedOn: '2026-08-14',
      collectedBy: 'user-789',
      remarks: 'First installment payment',
    });

    expect(payment.id).toBeDefined();
    expect(payment.invoiceId).toBe('inv-123');
    expect(payment.amount).toBe(5000.5);
    expect(payment.paymentMode).toBe('cash');
    expect(payment.receivedOn).toBeInstanceOf(Date);
    expect(payment.collectedBy).toBe('user-789');
    expect(payment.remarks).toBe('First installment payment');
    expect(payment.createdAt).toBeInstanceOf(Date);
  });

  it('accepts all supported payment modes: cash, upi, bank_transfer', () => {
    const modes = ['cash', 'upi', 'bank_transfer'] as const;
    for (const mode of modes) {
      const p = PaymentEntity.create({
        invoiceId: 'inv-1',
        amount: 1000,
        paymentMode: mode,
      });
      expect(p.paymentMode).toBe(mode);
    }
  });

  it('rejects non-positive payment amounts (0 or negative)', () => {
    expect(() =>
      PaymentEntity.create({
        invoiceId: 'inv-1',
        amount: 0,
        paymentMode: 'cash',
      })
    ).toThrow(ValidationError);

    expect(() =>
      PaymentEntity.create({
        invoiceId: 'inv-1',
        amount: -500,
        paymentMode: 'cash',
      })
    ).toThrow(ValidationError);
  });

  it('rejects invalid payment modes', () => {
    expect(() =>
      PaymentEntity.create({
        invoiceId: 'inv-1',
        amount: 1000,
        paymentMode: 'credit_card' as any,
      })
    ).toThrow(ValidationError);
  });

  it('enforces 500-character limit on remarks', () => {
    const longRemarks = 'a'.repeat(501);
    expect(() =>
      PaymentEntity.create({
        invoiceId: 'inv-1',
        amount: 1000,
        paymentMode: 'cash',
        remarks: longRemarks,
      })
    ).toThrow(ValidationError);
  });

  it('enforces immutability: getters return copies of dates and no setters exist', () => {
    const payment = PaymentEntity.create({
      invoiceId: 'inv-1',
      amount: 1000,
      paymentMode: 'upi',
      receivedOn: new Date('2026-08-14T00:00:00.000Z'),
    });

    const d1 = payment.receivedOn;
    d1.setFullYear(2030);

    expect(payment.receivedOn.getUTCFullYear()).toBe(2026);
    expect((payment as any).updateAmount).toBeUndefined();
    expect((payment as any).delete).toBeUndefined();
  });
});
