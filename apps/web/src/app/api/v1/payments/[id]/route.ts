/**
 * GET /api/v1/payments/[id] — Get payment detail
 */
import { type NextRequest } from 'next/server';
import {
  GetPaymentUseCase,
  PrismaPaymentRepository,
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
  apiSuccess,
  methodNotAllowed,
} from '../../_lib/v1-guard';
import { uuidParamSchema } from '../../_lib/v1-validators';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const resolvedParams = await params;
  const paramParsed = uuidParamSchema.safeParse(resolvedParams);
  if (!paramParsed.success) {
    throw new ValidationError(
      'Invalid payment ID format.',
      paramParsed.error.flatten().fieldErrors as Record<string, unknown>
    );
  }

  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.BILLING_READ);

    const prisma = db;
    const paymentRepo = new PrismaPaymentRepository(prisma);
    const useCase = new GetPaymentUseCase(paymentRepo);

    const payment = await useCase.execute(ctx.instituteId, paramParsed.data.id);

    return apiSuccess(payment, requestId);
  });
}

export async function POST() {
  return methodNotAllowed(['GET']);
}
export async function PUT() {
  return methodNotAllowed(['GET']);
}
export async function PATCH() {
  return methodNotAllowed(['GET']);
}
export async function DELETE() {
  return methodNotAllowed(['GET']);
}
