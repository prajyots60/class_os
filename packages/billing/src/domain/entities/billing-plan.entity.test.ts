import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { BillingPlanEntity } from './billing-plan.entity';

describe('BillingPlanEntity Domain Entity', () => {
  const instituteId = '00000000-0000-0000-0000-000000000001';
  const enrollmentId = '00000000-0000-0000-0000-000000000002';
  const startDate = new Date('2026-09-01');

  it('creates a valid monthly BillingPlanEntity with no discount', () => {
    const plan = BillingPlanEntity.create({
      instituteId,
      enrollmentId,
      type: 'monthly',
      amount: 5000,
      billingStartDate: startDate,
    });

    expect(plan.id).toBeDefined();
    expect(plan.instituteId).toBe(instituteId);
    expect(plan.enrollmentId).toBe(enrollmentId);
    expect(plan.type).toBe('monthly');
    expect(plan.amount).toBe(5000);
    expect(plan.discountType).toBe('none');
    expect(plan.discountValue).toBeNull();
    expect(plan.calculateStandardInvoiceAmount()).toBe(5000);
    expect(plan.calculateEffectiveFirstInvoiceAmount()).toBe(5000);
  });

  it('calculates effective first invoice amount when override is provided', () => {
    const plan = BillingPlanEntity.create({
      instituteId,
      enrollmentId,
      type: 'monthly',
      amount: 5000,
      discountType: 'percentage',
      discountValue: 10,
      billingStartDate: startDate,
      firstInvoiceAmountOverride: 2000,
    });

    expect(plan.calculateStandardInvoiceAmount()).toBe(4500);
    expect(plan.calculateEffectiveFirstInvoiceAmount()).toBe(2000);
  });

  it('rejects creation without enrollmentId (BIL-001)', () => {
    expect(() =>
      BillingPlanEntity.create({
        instituteId,
        enrollmentId: '',
        type: 'monthly',
        amount: 5000,
        billingStartDate: startDate,
      }),
    ).toThrow(ValidationError);
  });

  it('rejects negative amount', () => {
    expect(() =>
      BillingPlanEntity.create({
        instituteId,
        enrollmentId,
        type: 'monthly',
        amount: -500,
        billingStartDate: startDate,
      }),
    ).toThrow(ValidationError);
  });

  it('supports contract updates for discount and first invoice override', () => {
    const plan = BillingPlanEntity.create({
      instituteId,
      enrollmentId,
      type: 'one_time',
      amount: 10000,
      billingStartDate: startDate,
    });

    plan.updateDiscount('fixed', 1000);
    expect(plan.discountType).toBe('fixed');
    expect(plan.discountValue).toBe(1000);
    expect(plan.calculateStandardInvoiceAmount()).toBe(9000);

    plan.updateFirstInvoiceOverride(3000);
    expect(plan.firstInvoiceAmountOverride).toBe(3000);
    expect(plan.calculateEffectiveFirstInvoiceAmount()).toBe(3000);

    plan.updateFirstInvoiceOverride(null);
    expect(plan.firstInvoiceAmountOverride).toBeNull();
    expect(plan.calculateEffectiveFirstInvoiceAmount()).toBe(9000);
  });
});
