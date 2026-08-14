/**
 * GET  /api/v1/invoices — List invoices (tenant-scoped)
 * POST /api/v1/invoices — Generate invoice
 */
import { type NextRequest } from 'next/server';
import {
  ListInvoicesUseCase,
  GenerateInvoiceUseCase,
  PrismaBillingPlanRepository,
  PrismaInvoiceRepository,
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
  v1ListInvoicesQuerySchema,
  v1GenerateInvoiceSchema,
} from '../_lib/v1-validators';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.BILLING_READ);

    const { searchParams } = new URL(req.url);
    const raw = {
      billingPlanId: searchParams.get('billingPlanId') ?? undefined,
      enrollmentId: searchParams.get('enrollmentId') ?? undefined,
      studentId: searchParams.get('studentId') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      overdue: searchParams.get('overdue') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    };

    const parsed = v1ListInvoicesQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid query parameters.',
        parsed.error.flatten().fieldErrors as Record<string, unknown>
      );
    }

    const prisma = db;
    const invoiceRepo = new PrismaInvoiceRepository(prisma);
    const useCase = new ListInvoicesUseCase(invoiceRepo);

    const invoices = await useCase.execute(ctx.instituteId, {
      billingPlanId: parsed.data.billingPlanId,
      enrollmentId: parsed.data.enrollmentId,
      studentId: parsed.data.studentId,
      status: parsed.data.status,
      overdue: parsed.data.overdue,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
    });

    const pageSize = parsed.data.limit ?? invoices.length;
    const hasMore = invoices.length === pageSize;
    const lastItem = invoices.length > 0 ? invoices[invoices.length - 1] : null;

    return apiCollection(
      invoices,
      {
        cursor: parsed.data.cursor ?? null,
        nextCursor: hasMore && lastItem ? lastItem.id : null,
        hasMore,
        pageSize,
        total: invoices.length,
      },
      requestId
    );
  });
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.BILLING_WRITE);

    const body = await req.json().catch(() => ({}));
    const parsed = v1GenerateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid request payload.',
        parsed.error.flatten().fieldErrors as Record<string, unknown>
      );
    }

    const prisma = db;
    const planRepo = new PrismaBillingPlanRepository(prisma);
    const invoiceRepo = new PrismaInvoiceRepository(prisma);
    const useCase = new GenerateInvoiceUseCase(planRepo, invoiceRepo);

    const invoice = await useCase.execute(ctx.instituteId, {
      billingPlanId: parsed.data.billingPlanId,
      periodYearMonth: parsed.data.billingPeriod,
      installmentNumber: parsed.data.installmentNumber,
    });

    return apiSuccess(invoice, requestId, 201);
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
