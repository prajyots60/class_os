/**
 * GET /api/v1/communication/notifications/unread-count — Unread notification count for recipient
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
  CountUnreadNotificationsUseCase,
} from '@coaching-os/communication';
import { generateRequestId } from '@coaching-os/observability';
import {
  withV1ReadGuard,
  apiSuccess,
  methodNotAllowed,
} from '../../../_lib/v1-guard';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.NOTIFICATION_READ);

    const repo = new PrismaNotificationRepository();
    const useCase = new CountUnreadNotificationsUseCase(repo);

    const result = await useCase.execute(ctx);
    return apiSuccess(result, requestId);
  });
}

export async function POST() { return methodNotAllowed(['GET']); }
export async function PUT() { return methodNotAllowed(['GET']); }
export async function PATCH() { return methodNotAllowed(['GET']); }
export async function DELETE() { return methodNotAllowed(['GET']); }
