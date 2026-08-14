/**
 * GET   /api/v1/billing-plans/[id] — Get billing plan detail
 * PATCH /api/v1/billing-plans/[id] — Update billing plan details
 */
import { type NextRequest } from 'next/server';
import {
  GetBillingPlanUseCase,
  UpdateBillingPlanUseCase,
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
  methodNotAllowed,
} from '../../_lib/v1-guard';
import {
  uuidParamSchema,
  v1UpdateBillingPlanSchema,
} from '../../_lib/v1-validators';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const resolvedParams = await params;
  const paramParsed = uuidParamSchema.safeParse(resolvedParams);
  if (!paramParsed.success) {
    throw new ValidationError(
      'Invalid billing plan ID format.',
      paramParsed.error.flatten().fieldErrors as Record<string, unknown>
    );
  }

  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.BILLING_READ);

    const prisma = db;
    const planRepo = new PrismaBillingPlanRepository(prisma);
    const useCase = new GetBillingPlanUseCase(planRepo);

    const plan = await useCase.execute({
      instituteId: ctx.instituteId,
      id: paramParsed.data.id,
    });

    return apiSuccess(plan, requestId);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const resolvedParams = await params;
  const paramParsed = uuidParamSchema.safeParse(resolvedParams);
  if (!paramParsed.success) {
    throw new ValidationError(
      'Invalid billing plan ID format.',
      paramParsed.error.flatten().fieldErrors as Record<string, unknown>
    );
  }

  return withV1MutationGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.BILLING_WRITE);

    const body = await req.json().catch(() => ({}));
    const parsed = v1UpdateBillingPlanSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid update payload.',
        parsed.error.flatten().fieldErrors as Record<string, unknown>
      );
    }

    const prisma = db;
    const planRepo = new PrismaBillingPlanRepository(prisma);
    const useCase = new UpdateBillingPlanUseCase(planRepo);

    const updated = await useCase.execute({
      instituteId: ctx.instituteId,
      id: paramParsed.data.id,
      discountType: parsed.data.discountType ?? undefined,
      discountValue: parsed.data.discountValue,
      firstInvoiceAmountOverride: parsed.data.firstInvoiceAmountOverride,
    });

    return apiSuccess(updated, requestId);
  });
}

export async function POST() {
  return methodNotAllowed(['GET', 'PATCH']);
}
export async function PUT() {
  return methodNotAllowed(['GET', 'PATCH']);
}
export async function DELETE() {
  return methodNotAllowed(['GET', 'PATCH']);
}
