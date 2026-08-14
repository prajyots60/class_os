/**
 * Financial formatters and helper utilities for Billing UI
 */

/**
 * Format numeric currency value into standard Indian Rupee notation (INR)
 * Example: 10000 -> "₹10,000.00"
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (num === null || num === undefined || isNaN(num)) {
    return '₹0.00';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format ISO date string into readable date (e.g. 2026-08-14 -> "14 Aug 2026")
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '—';
  const d = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Derived overdue helper invariant:
 * Overdue if dueDate < today AND status !== 'paid'
 */
export function isInvoiceOverdue(dueDate: string | Date, status: string): boolean {
  if (status === 'paid') return false;
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}
