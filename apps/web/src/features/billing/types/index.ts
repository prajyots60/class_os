/**
 * Client DTOs and view models for Billing UI Feature
 */

export type FeeType = 'monthly' | 'one_time' | 'installment';
export type InvoiceStatus = 'pending' | 'partial' | 'paid';
export type PaymentMode = 'cash' | 'upi' | 'bank_transfer';
export type DiscountType = 'none' | 'percentage' | 'fixed';

export interface BillingPlanDTO {
  id: string;
  instituteId: string;
  enrollmentId: string;
  studentId?: string;
  studentName?: string;
  batchName?: string;
  feeType: FeeType;
  totalAmount: number;
  billingStartDate: string;
  installmentCount?: number | null;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  firstInvoiceAmountOverride?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDTO {
  id: string;
  instituteId: string;
  billingPlanId: string;
  enrollmentId?: string;
  studentId?: string;
  studentName?: string;
  batchName?: string;
  invoiceNumber: string;
  amount: number;
  paidAmount: number;
  outstanding: number;
  dueDate: string;
  status: InvoiceStatus;
  isOverdue?: boolean;
  billingPeriodIndex?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDTO {
  id: string;
  instituteId: string;
  invoiceId: string;
  invoiceNumber?: string;
  studentName?: string;
  amount: number;
  paymentMode: PaymentMode;
  receivedOn: string;
  collectedBy: string;
  remarks?: string | null;
  receiptId?: string | null;
  receiptNumber?: string | null;
  createdAt: string;
}

export interface ReceiptDTO {
  id: string;
  instituteId: string;
  paymentId: string;
  receiptNumber: string;
  amount?: number;
  paymentMode?: PaymentMode;
  invoiceNumber?: string;
  studentName?: string;
  generatedAt: string;
  downloadUrl: string | null;
}

export interface CreateBillingPlanInput {
  enrollmentId: string;
  feeType: FeeType;
  totalAmount: number;
  billingStartDate: string;
  installmentCount?: number | null;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  firstInvoiceAmountOverride?: number | null;
}

export interface UpdateBillingPlanInput {
  discountType?: DiscountType | null;
  discountValue?: number | null;
  firstInvoiceAmountOverride?: number | null;
}

export interface GenerateInvoiceInput {
  billingPlanId: string;
  billingPeriodIndex?: number;
}

export interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  paymentMode: PaymentMode;
  receivedOn: string;
  remarks?: string | null;
}

export interface GenerateReceiptInput {
  paymentId: string;
}
