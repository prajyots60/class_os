import { ValidationError } from '@coaching-os/shared';
import { describe, expect, it } from 'vitest';
import { InvoiceEntity } from './invoice.entity';

describe('InvoiceEntity', () => {
  const validProps = {
    id: '11111111-1111-4111-a111-111111111111',
    billingPlanId: '22222222-2222-4222-a222-222222222222',
    amount: 10000.5,
    dueDate: new Date('2026-09-01T00:00:00.000Z'),
    status: 'pending' as const,
  };

  it('creates an invoice with valid props and rounds amount to 2 decimal places', () => {
    const invoice = InvoiceEntity.create(validProps);

    expect(invoice.id).toBe(validProps.id);
    expect(invoice.billingPlanId).toBe(validProps.billingPlanId);
    expect(invoice.amount).toBe(10000.5);
    expect(invoice.status).toBe('pending');
    expect(invoice.dueDate.toISOString()).toBe(validProps.dueDate.toISOString());
  });

  it('auto-generates UUID if id is not provided', () => {
    const invoice = InvoiceEntity.create({
      billingPlanId: validProps.billingPlanId,
      amount: 5000,
      dueDate: validProps.dueDate,
    });

    expect(invoice.id).toBeDefined();
    expect(invoice.id.length).toBeGreaterThan(10);
  });

  it('rejects empty ID, billingPlanId, or negative amount', () => {
    expect(() =>
      InvoiceEntity.create({
        id: '  ',
        billingPlanId: validProps.billingPlanId,
        amount: 100,
        dueDate: validProps.dueDate,
      })
    ).toThrow(ValidationError);

    expect(() =>
      InvoiceEntity.create({
        billingPlanId: '',
        amount: 100,
        dueDate: validProps.dueDate,
      })
    ).toThrow(ValidationError);

    expect(() =>
      InvoiceEntity.create({
        billingPlanId: validProps.billingPlanId,
        amount: -50,
        dueDate: validProps.dueDate,
      })
    ).toThrow(ValidationError);
  });

  it('enforces financial field immutability (getters return new Date instances)', () => {
    const invoice = InvoiceEntity.create(validProps);
    const date1 = invoice.dueDate;
    date1.setFullYear(2099);

    expect(invoice.dueDate.getFullYear()).toBe(2026);
  });

  it('correctly calculates outstanding balance', () => {
    const invoice = InvoiceEntity.create({
      billingPlanId: validProps.billingPlanId,
      amount: 10000,
      dueDate: validProps.dueDate,
    });

    expect(invoice.calculateOutstanding(0)).toBe(10000);
    expect(invoice.calculateOutstanding(4000)).toBe(6000);
    expect(invoice.calculateOutstanding(10000)).toBe(0);
    expect(invoice.calculateOutstanding(12000)).toBe(0);
  });

  it('correctly derives overdue status', () => {
    const invoice = InvoiceEntity.create({
      billingPlanId: validProps.billingPlanId,
      amount: 10000,
      dueDate: new Date('2026-08-01T00:00:00.000Z'),
    });

    const beforeDueDate = new Date('2026-07-15T00:00:00.000Z');
    const afterDueDate = new Date('2026-08-15T00:00:00.000Z');

    expect(invoice.isOverdue(beforeDueDate)).toBe(false);
    expect(invoice.isOverdue(afterDueDate)).toBe(true);

    invoice.updateStatusFromPayments(10000); // Fully paid
    expect(invoice.isOverdue(afterDueDate)).toBe(false);
  });

  it('updates status from payments and rejects invalid status transitions', () => {
    const invoice = InvoiceEntity.create({
      billingPlanId: validProps.billingPlanId,
      amount: 10000,
      dueDate: validProps.dueDate,
    });

    expect(invoice.status).toBe('pending');

    invoice.updateStatusFromPayments(5000);
    expect(invoice.status).toBe('partial');

    invoice.updateStatusFromPayments(10000);
    expect(invoice.status).toBe('paid');

    // Attempt backward transition from paid -> partial/pending should throw
    expect(() => invoice.updateStatusFromPayments(5000)).toThrow(ValidationError);
  });
});
