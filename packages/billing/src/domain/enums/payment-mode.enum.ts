export type PaymentMode = 'cash' | 'upi' | 'bank_transfer';

export const VALID_PAYMENT_MODES: readonly PaymentMode[] = [
  'cash',
  'upi',
  'bank_transfer',
] as const;

export function isValidPaymentMode(mode: string): mode is PaymentMode {
  return VALID_PAYMENT_MODES.includes(mode as PaymentMode);
}
