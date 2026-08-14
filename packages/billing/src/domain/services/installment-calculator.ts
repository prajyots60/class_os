import { ValidationError } from '@coaching-os/shared';
import type { Discount } from '../value-objects/discount.vo';

export interface InstallmentScheduleParams {
  baseAmount: number;
  discount: Discount;
  billingStartDate: Date;
  firstInvoiceAmountOverride?: number | null;
  totalInstallments: number; // N >= 2
}

export interface InstallmentItem {
  installmentNumber: number; // 1-indexed (1 ... N)
  amount: number; // 2 decimal exact
  dueDate: Date;
}

/**
 * Calendar-aware month addition with month-end date capping.
 * E.g., Jan 31 + 1 month -> Feb 28 (or Feb 29 in leap year).
 */
export function addMonthsWithMonthEndCap(baseDate: Date, monthsToAdd: number): Date {
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth();
  const day = baseDate.getUTCDate();

  const targetMonth = month + monthsToAdd;
  const result = new Date(Date.UTC(year, targetMonth, day));

  const expectedMonth = ((month + monthsToAdd) % 12 + 12) % 12;
  if (result.getUTCMonth() !== expectedMonth) {
    result.setUTCDate(0); // Sets to last day of previous month in UTC
  }

  return result;
}

/**
 * Calculates deterministic installment schedule enforcing R-006, R-007, and R-008.
 * Uses strict integer-cent arithmetic to guarantee SUM(installment amounts) == Net Total Obligation.
 */
export function calculateInstallmentSchedule(
  params: InstallmentScheduleParams
): InstallmentItem[] {
  const {
    baseAmount,
    discount,
    billingStartDate,
    firstInvoiceAmountOverride,
    totalInstallments,
  } = params;

  if (!Number.isInteger(totalInstallments) || totalInstallments < 2) {
    throw new ValidationError(
      `totalInstallments must be an integer >= 2 (got ${totalInstallments})`
    );
  }

  if (!(billingStartDate instanceof Date) || isNaN(billingStartDate.getTime())) {
    throw new ValidationError('Invalid billing start date for installment calculation');
  }

  // 1. Net total plan obligation (after discount)
  const netTotalAmount = discount.calculateFinalAmount(baseAmount);
  const totalCents = Math.round((netTotalAmount + Number.EPSILON) * 100);

  const items: InstallmentItem[] = [];

  const hasOverride =
    firstInvoiceAmountOverride !== undefined &&
    firstInvoiceAmountOverride !== null &&
    firstInvoiceAmountOverride >= 0;

  if (hasOverride) {
    // R-008: First invoice gets explicit override
    const overrideCents = Math.round((firstInvoiceAmountOverride + Number.EPSILON) * 100);
    const amount1 = overrideCents / 100;
    const dueDate1 = addMonthsWithMonthEndCap(billingStartDate, 0);

    items.push({
      installmentNumber: 1,
      amount: amount1,
      dueDate: dueDate1,
    });

    // Remaining balance distributed over N - 1 installments
    const remainingCents = Math.max(0, totalCents - overrideCents);
    const remainingCount = totalInstallments - 1;

    if (remainingCount > 0) {
      const baseCents = Math.floor(remainingCents / remainingCount);
      const remainderCents = remainingCents - baseCents * remainingCount;

      for (let i = 0; i < remainingCount; i++) {
        const extraCent = i < remainderCents ? 1 : 0;
        const cents = baseCents + extraCent;
        const instNum = i + 2;
        const dueDate = addMonthsWithMonthEndCap(billingStartDate, instNum - 1);

        items.push({
          installmentNumber: instNum,
          amount: cents / 100,
          dueDate,
        });
      }
    }
  } else {
    // R-007: Standard installment distribution over N installments
    const baseCents = Math.floor(totalCents / totalInstallments);
    const remainderCents = totalCents - baseCents * totalInstallments;

    for (let i = 0; i < totalInstallments; i++) {
      const extraCent = i < remainderCents ? 1 : 0;
      const cents = baseCents + extraCent;
      const instNum = i + 1;
      const dueDate = addMonthsWithMonthEndCap(billingStartDate, instNum - 1);

      items.push({
        installmentNumber: instNum,
        amount: cents / 100,
        dueDate,
      });
    }
  }

  return items;
}
