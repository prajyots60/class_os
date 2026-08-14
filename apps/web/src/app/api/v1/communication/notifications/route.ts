/**
 * GET /api/v1/communication/notifications — List notifications for authenticated recipient
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
  ListNotificationsUseCase,
  listNotificationsQuerySchema,
} from '@coaching-os/communication';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import {
  withV1ReadGuard,
  apiCollection,
  methodNotAllowed,
} from '../../_lib/v1-guard';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.NOTIFICATION_READ);

    const { searchParams } = new URL(req.url);
    const raw = {
      isRead: searchParams.get('isRead') === 'true' ? true : searchParams.get('isRead') === 'false' ? false : undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    };

    const parsed = listNotificationsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid query parameters.',
        parsed.error.flatten().fieldErrors as Record<string, unknown>,
      );
    }

    const repo = new PrismaNotificationRepository();
    const useCase = new ListNotificationsUseCase(repo);

    const result = await useCase.execute(ctx, {
      isRead: parsed.data.isRead,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
    });

    const pageSize = parsed.data.limit ?? result.items.length;
    const hasMore = result.nextCursor !== null;

    return apiCollection(
      result.items,
      {
        cursor: parsed.data.cursor ?? null,
        nextCursor: result.nextCursor,
        hasMore,
        pageSize,
      },
      requestId,
    );
  });
}

export async function POST() { return methodNotAllowed(['GET']); }
export async function PUT() { return methodNotAllowed(['GET']); }
export async function PATCH() { return methodNotAllowed(['GET']); }
export async function DELETE() { return methodNotAllowed(['GET']); }
