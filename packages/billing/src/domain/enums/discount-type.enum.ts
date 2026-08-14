export type DiscountType = 'none' | 'percentage' | 'fixed';

export const DISCOUNT_TYPES: Record<string, DiscountType> = {
  NONE: 'none',
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
} as const;

export function isValidDiscountType(val: string): val is DiscountType {
  return val === 'none' || val === 'percentage' || val === 'fixed';
}
