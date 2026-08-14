/**
  * GET  /api/v1/billing-plans — List billing plans (tenant-scoped)
  * POST /api/v1/billing-plans — Create billing plan
  */
import { type NextRequest } from 'next/server';
import {
  ListBillingPlansUseCase,
  CreateBillingPlanUseCase,
  PrismaBillingPlanRepository,
} from '@coaching-os/billing';
import {
  AuthorizationEngine,
  CAPABILITIES,
  PrismaEnrollmentRepository,
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
  v1ListBillingPlansQuerySchema,
  v1CreateBillingPlanSchema,
} from '../_lib/v1-validators';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.BILLING_READ);

    const { searchParams } = new URL(req.url);
    const raw = {
      enrollmentId: searchParams.get('enrollmentId') ?? undefined,
      studentId: searchParams.get('studentId') ?? undefined,
      feeType: searchParams.get('feeType') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    };

    const parsed = v1ListBillingPlansQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid query parameters.',
        parsed.error.flatten().fieldErrors as Record<string, unknown>
      );
    }

    const prisma = db;
    const planRepo = new PrismaBillingPlanRepository(prisma);
    const useCase = new ListBillingPlansUseCase(planRepo);

    const plans = await useCase.execute({
      instituteId: ctx.instituteId,
      enrollmentId: parsed.data.enrollmentId,
      studentId: parsed.data.studentId,
      feeType: parsed.data.feeType,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
    });

    const pageSize = parsed.data.limit ?? plans.length;
    const hasMore = plans.length === pageSize;
    const lastItem = plans.length > 0 ? plans[plans.length - 1] : null;

    return apiCollection(
      plans,
      {
        cursor: parsed.data.cursor ?? null,
        nextCursor: hasMore && lastItem ? lastItem.id : null,
        hasMore,
        pageSize,
        total: plans.length,
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
    const parsed = v1CreateBillingPlanSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid request payload.',
        parsed.error.flatten().fieldErrors as Record<string, unknown>
      );
    }

    const prisma = db;
    const planRepo = new PrismaBillingPlanRepository(prisma);
    const enrollmentRepo = new PrismaEnrollmentRepository();
    const useCase = new CreateBillingPlanUseCase(planRepo, enrollmentRepo);

    const result = await useCase.execute({
      instituteId: ctx.instituteId,
      enrollmentId: parsed.data.enrollmentId,
      type: parsed.data.feeType,
      amount: parsed.data.totalAmount,
      billingStartDate: parsed.data.billingStartDate,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      firstInvoiceAmountOverride: parsed.data.firstInvoiceAmountOverride,
    });

    return apiSuccess(result, requestId, 201);
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
