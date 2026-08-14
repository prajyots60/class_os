/**
 * GET  /api/v1/payments — List payments (tenant-scoped)
 * POST /api/v1/payments — Record payment
 */
import { type NextRequest } from 'next/server';
import {
  ListPaymentsUseCase,
  RecordPaymentUseCase,
  PrismaPaymentRepository,
  PrismaInvoiceRepository,
  PrismaBillingPlanRepository,
} from '@coaching-os/billing';
import {
  AuthorizationEngine,
  CAPABILITIES,
} from '@coaching-os/identity';
import { db } from '@coaching-os/database';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import {
  withV1ReadGuard,
  withV1MutationGuard,
  apiSuccess,
  apiCollection,
  methodNotAllowed,
} from '../_lib/v1-guard';
import {
  v1ListPaymentsQuerySchema,
  v1RecordPaymentSchema,
} from '../_lib/v1-validators';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.BILLING_READ);

    const { searchParams } = new URL(req.url);
    const raw = {
      invoiceId: searchParams.get('invoiceId') ?? undefined,
      studentId: searchParams.get('studentId') ?? undefined,
      batchId: searchParams.get('batchId') ?? undefined,
      paymentMode: searchParams.get('paymentMode') ?? undefined,
      fromDate: searchParams.get('fromDate') ?? undefined,
      toDate: searchParams.get('toDate') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    };

    const parsed = v1ListPaymentsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid query parameters.',
        parsed.error.flatten().fieldErrors as Record<string, unknown>
      );
    }

    const prisma = db;
    const paymentRepo = new PrismaPaymentRepository(prisma);
    const useCase = new ListPaymentsUseCase(paymentRepo);

    const payments = await useCase.execute(ctx.instituteId, {
      invoiceId: parsed.data.invoiceId,
      studentId: parsed.data.studentId,
      batchId: parsed.data.batchId,
      paymentMode: parsed.data.paymentMode,
      fromDate: parsed.data.fromDate,
      toDate: parsed.data.toDate,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
    });

    const pageSize = parsed.data.limit ?? payments.length;
    const hasMore = payments.length === pageSize;
    const lastItem = payments.length > 0 ? payments[payments.length - 1] : null;

    return apiCollection(
      payments,
      {
        cursor: parsed.data.cursor ?? null,
        nextCursor: hasMore && lastItem ? lastItem.id : null,
        hasMore,
        pageSize,
        total: payments.length,
      },
      requestId
    );
  });
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.PAYMENT_RECORD);

    const body = await req.json().catch(() => ({}));
    const parsed = v1RecordPaymentSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid request payload.',
        parsed.error.flatten().fieldErrors as Record<string, unknown>
      );
    }

    const prisma = db;
    const planRepo = new PrismaBillingPlanRepository(prisma);
    const invoiceRepo = new PrismaInvoiceRepository(prisma);
    const paymentRepo = new PrismaPaymentRepository(prisma);
    const useCase = new RecordPaymentUseCase(planRepo, invoiceRepo, paymentRepo, prisma);

    const payment = await useCase.execute(ctx.instituteId, {
      invoiceId: parsed.data.invoiceId,
      amount: parsed.data.amount,
      paymentMode: parsed.data.paymentMode,
      receivedOn: parsed.data.receivedOn,
      collectedBy: ctx.userId,
      remarks: parsed.data.remarks,
    });

    return apiSuccess(payment, requestId, 201);
  });
}

export async function PUT() {
  return methodNotAllowed(['GET', 'POST']);
}
export async function PATCH() {
  return methodNotAllowed(['GET', 'POST']);
}
export async function DELETE() {
  return methodNotAllowed(['GET', 'POST']);
}
