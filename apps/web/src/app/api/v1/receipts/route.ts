/**
 * POST /api/v1/receipts — Generate receipt for payment
 */
import { type NextRequest } from 'next/server';
import {
  GenerateReceiptUseCase,
  PrismaReceiptRepository,
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
  withV1MutationGuard,
  apiSuccess,
  methodNotAllowed,
} from '../_lib/v1-guard';
import { v1GenerateReceiptSchema } from '../_lib/v1-validators';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.RECEIPT_ISSUE);

    const body = await req.json().catch(() => ({}));
    const parsed = v1GenerateReceiptSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid request payload.',
        parsed.error.flatten().fieldErrors as Record<string, unknown>
      );
    }

    const prisma = db;
    const receiptRepo = new PrismaReceiptRepository(prisma);
    const paymentRepo = new PrismaPaymentRepository(prisma);
    const useCase = new GenerateReceiptUseCase(paymentRepo, receiptRepo, prisma);

    const receipt = await useCase.execute(ctx.instituteId, {
      paymentId: parsed.data.paymentId,
    });

    return apiSuccess({ ...receipt, downloadUrl: null }, requestId, 201);
  });
}

export async function GET() {
  return methodNotAllowed(['POST']);
}
export async function PUT() {
  return methodNotAllowed(['POST']);
}
export async function PATCH() {
  return methodNotAllowed(['POST']);
}
export async function DELETE() {
  return methodNotAllowed(['POST']);
}
