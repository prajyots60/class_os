/**
 * v1-billing-client.ts
 *
 * Client HTTP API Wrapper for Protected Billing APIs (/api/v1)
 * Consumes /api/v1/billing-plans, /api/v1/invoices, /api/v1/payments, /api/v1/receipts.
 * Direct Prisma imports or bypasses are strictly forbidden.
 */

import type {
  BillingPlanDTO,
  CreateBillingPlanInput,
  GenerateInvoiceInput,
  GenerateReceiptInput,
  InvoiceDTO,
  PaymentDTO,
  ReceiptDTO,
  RecordPaymentInput,
  UpdateBillingPlanInput,
} from '../types';

export class BillingApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'BillingApiError';
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'same-origin',
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = body?.error?.message || body?.message || `HTTP Request failed with status ${res.status}`;
    throw new BillingApiError(errorMsg, res.status, body?.error?.details || body);
  }

  return body.data as T;
}

export const v1BillingClient = {
  // ─── Billing Plans ─────────────────────────────────────────────────────────

  async listBillingPlans(params?: {
    enrollmentId?: string;
    studentId?: string;
    type?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: BillingPlanDTO[]; nextCursor?: string }> {
    const search = new URLSearchParams();
    if (params?.enrollmentId) search.set('enrollmentId', params.enrollmentId);
    if (params?.studentId) search.set('studentId', params.studentId);
    if (params?.type) search.set('type', params.type);
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.cursor) search.set('cursor', params.cursor);

    const query = search.toString();
    const url = `/api/v1/billing-plans${query ? `?${query}` : ''}`;
    const data = await request<BillingPlanDTO[] | { items: BillingPlanDTO[]; nextCursor?: string }>(url);
    if (Array.isArray(data)) {
      return { items: data };
    }
    return { items: data.items || [], nextCursor: data.nextCursor };
  },

  async getBillingPlanById(id: string): Promise<BillingPlanDTO> {
    return request<BillingPlanDTO>(`/api/v1/billing-plans/${id}`);
  },

  async createBillingPlan(input: CreateBillingPlanInput): Promise<BillingPlanDTO> {
    return request<BillingPlanDTO>('/api/v1/billing-plans', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateBillingPlan(id: string, input: UpdateBillingPlanInput): Promise<BillingPlanDTO> {
    return request<BillingPlanDTO>(`/api/v1/billing-plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  // ─── Invoices ──────────────────────────────────────────────────────────────

  async listInvoices(params?: {
    billingPlanId?: string;
    enrollmentId?: string;
    studentId?: string;
    status?: string;
    overdue?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: InvoiceDTO[]; nextCursor?: string }> {
    const search = new URLSearchParams();
    if (params?.billingPlanId) search.set('billingPlanId', params.billingPlanId);
    if (params?.enrollmentId) search.set('enrollmentId', params.enrollmentId);
    if (params?.studentId) search.set('studentId', params.studentId);
    if (params?.status) search.set('status', params.status);
    if (params?.overdue !== undefined) search.set('overdue', String(params.overdue));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.cursor) search.set('cursor', params.cursor);

    const query = search.toString();
    const url = `/api/v1/invoices${query ? `?${query}` : ''}`;
    const data = await request<InvoiceDTO[] | { items: InvoiceDTO[]; nextCursor?: string }>(url);
    if (Array.isArray(data)) {
      return { items: data };
    }
    return { items: data.items || [], nextCursor: data.nextCursor };
  },

  async getInvoiceById(id: string): Promise<InvoiceDTO> {
    return request<InvoiceDTO>(`/api/v1/invoices/${id}`);
  },

  async generateInvoice(input: GenerateInvoiceInput): Promise<InvoiceDTO> {
    return request<InvoiceDTO>('/api/v1/invoices', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  // ─── Payments ──────────────────────────────────────────────────────────────

  async listPayments(params?: {
    invoiceId?: string;
    studentId?: string;
    batchId?: string;
    fromDate?: string;
    toDate?: string;
    paymentMode?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: PaymentDTO[]; nextCursor?: string }> {
    const search = new URLSearchParams();
    if (params?.invoiceId) search.set('invoiceId', params.invoiceId);
    if (params?.studentId) search.set('studentId', params.studentId);
    if (params?.batchId) search.set('batchId', params.batchId);
    if (params?.fromDate) search.set('fromDate', params.fromDate);
    if (params?.toDate) search.set('toDate', params.toDate);
    if (params?.paymentMode) search.set('paymentMode', params.paymentMode);
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.cursor) search.set('cursor', params.cursor);

    const query = search.toString();
    const url = `/api/v1/payments${query ? `?${query}` : ''}`;
    const data = await request<PaymentDTO[] | { items: PaymentDTO[]; nextCursor?: string }>(url);
    if (Array.isArray(data)) {
      return { items: data };
    }
    return { items: data.items || [], nextCursor: data.nextCursor };
  },

  async getPaymentById(id: string): Promise<PaymentDTO> {
    return request<PaymentDTO>(`/api/v1/payments/${id}`);
  },

  async recordPayment(input: RecordPaymentInput): Promise<PaymentDTO> {
    return request<PaymentDTO>('/api/v1/payments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  // ─── Receipts ──────────────────────────────────────────────────────────────

  async getReceiptById(id: string): Promise<ReceiptDTO> {
    return request<ReceiptDTO>(`/api/v1/receipts/${id}`);
  },

  async generateReceipt(input: GenerateReceiptInput): Promise<ReceiptDTO> {
    return request<ReceiptDTO>('/api/v1/receipts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
