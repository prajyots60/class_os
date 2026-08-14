import { ValidationError } from '@coaching-os/shared';
import { describe, expect, it } from 'vitest';
import { Discount } from '../value-objects/discount.vo';
import {
  addMonthsWithMonthEndCap,
  calculateInstallmentSchedule,
} from './installment-calculator';

describe('installment-calculator', () => {
  const startDate = new Date('2026-08-31T00:00:00.000Z');
  const noDiscount = Discount.create('none');

  describe('addMonthsWithMonthEndCap', () => {
    it('caps month-end dates correctly (Jan 31 -> Feb 28/29)', () => {
      const jan31 = new Date('2026-01-31T00:00:00.000Z');
      const febResult = addMonthsWithMonthEndCap(jan31, 1);

      expect(febResult.getMonth()).toBe(1); // Feb is index 1
      expect(febResult.getDate()).toBe(28); // 2026 is not leap year

      const leapJan31 = new Date('2028-01-31T00:00:00.000Z');
      const leapFebResult = addMonthsWithMonthEndCap(leapJan31, 1);
      expect(leapFebResult.getDate()).toBe(29); // 2028 is leap year
    });

    it('preserves day of month when target month has enough days', () => {
      const aug17 = new Date('2026-08-17T00:00:00.000Z');
      const sepResult = addMonthsWithMonthEndCap(aug17, 1);

      expect(sepResult.getMonth()).toBe(8); // Sep is index 8
      expect(sepResult.getDate()).toBe(17);
    });
  });

  describe('calculateInstallmentSchedule', () => {
    it('validates totalInstallments N >= 2', () => {
      expect(() =>
        calculateInstallmentSchedule({
          baseAmount: 10000,
          discount: noDiscount,
          billingStartDate: startDate,
          totalInstallments: 1,
        })
      ).toThrow(ValidationError);
    });

    it('R-007: distributes integer cents with exact total preservation (₹10,000 / 3)', () => {
      const schedule = calculateInstallmentSchedule({
        baseAmount: 10000,
        discount: noDiscount,
        billingStartDate: startDate,
        totalInstallments: 3,
      });

      expect(schedule).toHaveLength(3);
      expect(schedule[0]?.amount).toBe(3333.34);
      expect(schedule[1]?.amount).toBe(3333.33);
      expect(schedule[2]?.amount).toBe(3333.33);

      const sum = schedule.reduce((acc, item) => acc + item.amount, 0);
      expect(Math.round(sum * 100) / 100).toBe(10000.0);
    });

    it('R-007: distributes integer cents with awkward decimals (₹100 / 6)', () => {
      const schedule = calculateInstallmentSchedule({
        baseAmount: 100,
        discount: noDiscount,
        billingStartDate: startDate,
        totalInstallments: 6,
      });

      expect(schedule).toHaveLength(6);
      expect(schedule[0]?.amount).toBe(16.67);
      expect(schedule[1]?.amount).toBe(16.67);
      expect(schedule[2]?.amount).toBe(16.67);
      expect(schedule[3]?.amount).toBe(16.67);
      expect(schedule[4]?.amount).toBe(16.66);
      expect(schedule[5]?.amount).toBe(16.66);

      const sum = schedule.reduce((acc, item) => acc + item.amount, 0);
      expect(Math.round(sum * 100) / 100).toBe(100.0);
    });

    it('R-008: handles first invoice override (₹30,000 / 3 with ₹5,000 override)', () => {
      const schedule = calculateInstallmentSchedule({
        baseAmount: 30000,
        discount: noDiscount,
        billingStartDate: startDate,
        firstInvoiceAmountOverride: 5000,
        totalInstallments: 3,
      });

      expect(schedule).toHaveLength(3);
      expect(schedule[0]?.amount).toBe(5000.0);
      expect(schedule[1]?.amount).toBe(12500.0);
      expect(schedule[2]?.amount).toBe(12500.0);

      const sum = schedule.reduce((acc, item) => acc + item.amount, 0);
      expect(Math.round(sum * 100) / 100).toBe(30000.0);
    });

    it('R-008: handles first invoice override with remainder cents in remaining balance', () => {
      const schedule = calculateInstallmentSchedule({
        baseAmount: 10000.01,
        discount: noDiscount,
        billingStartDate: startDate,
        firstInvoiceAmountOverride: 3333.34,
        totalInstallments: 3,
      });

      expect(schedule).toHaveLength(3);
      expect(schedule[0]?.amount).toBe(3333.34);
      expect(schedule[1]?.amount).toBe(3333.34);
      expect(schedule[2]?.amount).toBe(3333.33);

      const sum = schedule.reduce((acc, item) => acc + item.amount, 0);
      expect(Math.round(sum * 100) / 100).toBe(10000.01);
    });

    it('applies discount before calculating installment distribution', () => {
      const percentageDiscount = Discount.create('percentage', 10); // 10% off 10,000 = 9,000 net

      const schedule = calculateInstallmentSchedule({
        baseAmount: 10000,
        discount: percentageDiscount,
        billingStartDate: startDate,
        totalInstallments: 3,
      });

      expect(schedule).toHaveLength(3);
      expect(schedule[0]?.amount).toBe(3000.0);
      expect(schedule[1]?.amount).toBe(3000.0);
      expect(schedule[2]?.amount).toBe(3000.0);

      const sum = schedule.reduce((acc, item) => acc + item.amount, 0);
      expect(Math.round(sum * 100) / 100).toBe(9000.0);
    });
  });
});
