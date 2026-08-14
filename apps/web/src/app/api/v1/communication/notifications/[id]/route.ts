/**
 * GET /api/v1/communication/notifications/[id] — Get single notification for recipient
 * POST   — 405
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
  GetNotificationUseCase,
} from '@coaching-os/communication';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import {
  withV1ReadGuard,
  apiSuccess,
  methodNotAllowed,
} from '../../../_lib/v1-guard';
import { uuidParamSchema } from '../../../_lib/v1-validators';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
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
    const useCase = new GetNotificationUseCase(repo);

    const notification = await useCase.execute(ctx, id);
    return apiSuccess(notification, requestId);
  });
}

export async function POST() { return methodNotAllowed(['GET']); }
export async function PUT() { return methodNotAllowed(['GET']); }
export async function PATCH() { return methodNotAllowed(['GET']); }
export async function DELETE() { return methodNotAllowed(['GET']); }
