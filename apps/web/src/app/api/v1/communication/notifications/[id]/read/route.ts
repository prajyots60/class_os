/**
 * POST /api/v1/communication/notifications/[id]/read — Mark notification as read
 * GET    — 405
 * PUT    — 405
 * PATCH  — 405
 * DELETE — 405
 */
import { type NextRequest } from 'next/server';
import {
  AuthorizationEngine,
  CAPABILITIES,
} from '@coaching-os/identity';
import {
  PrismaNotificationRepository,
  MarkNotificationReadUseCase,
} from '@coaching-os/communication';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import {
  withV1MutationGuard,
  apiSuccess,
  methodNotAllowed,
} from '../../../../_lib/v1-guard';
import { uuidParamSchema } from '../../../../_lib/v1-validators';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.NOTIFICATION_READ);

    const { id } = await params;
    const paramParse = uuidParamSchema.safeParse({ id });
    if (!paramParse.success) {
      throw new ValidationError(
        'Invalid notification ID format.',
        paramParse.error.flatten().fieldErrors as Record<string, unknown>,
      );
    }

    const repo = new PrismaNotificationRepository();
    const useCase = new MarkNotificationReadUseCase(repo);

    const updated = await useCase.execute(ctx, id);
    return apiSuccess(updated, requestId);
  });
}

export async function GET() { return methodNotAllowed(['POST']); }
export async function PUT() { return methodNotAllowed(['POST']); }
export async function PATCH() { return methodNotAllowed(['POST']); }
export async function DELETE() { return methodNotAllowed(['POST']); }
