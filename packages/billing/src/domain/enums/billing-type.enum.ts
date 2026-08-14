export type BillingType = 'monthly' | 'one_time' | 'installment';

export const BILLING_TYPES: Record<string, BillingType> = {
  MONTHLY: 'monthly',
  ONE_TIME: 'one_time',
  INSTALLMENT: 'installment',
} as const;

export function isValidBillingType(val: string): val is BillingType {
  return val === 'monthly' || val === 'one_time' || val === 'installment';
}
