/**
 * GET  /api/v1/communication/announcements — List announcements (tenant-scoped)
 * POST /api/v1/communication/announcements — Create draft announcement
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
  PrismaAnnouncementRepository,
  ListAnnouncementsUseCase,
  CreateAnnouncementUseCase,
  createAnnouncementSchema,
  listAnnouncementsQuerySchema,
} from '@coaching-os/communication';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import {
  withV1ReadGuard,
  withV1MutationGuard,
  apiSuccess,
  apiCollection,
  methodNotAllowed,
} from '../../_lib/v1-guard';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.ANNOUNCEMENT_READ);

    const { searchParams } = new URL(req.url);
    const raw = {
      batchId: searchParams.get('batchId') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    };

    const parsed = listAnnouncementsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid query parameters.',
        parsed.error.flatten().fieldErrors as Record<string, unknown>,
      );
    }

    const repo = new PrismaAnnouncementRepository();
    const useCase = new ListAnnouncementsUseCase(repo);

    const announcements = await useCase.execute(ctx, {
      batchId: parsed.data.batchId,
      status: parsed.data.status,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    const pageSize = parsed.data.limit ?? announcements.length;
    const hasMore = announcements.length === pageSize;
    const lastItem = announcements.length > 0 ? announcements[announcements.length - 1] : null;

    return apiCollection(announcements, {
      cursor: null,
      nextCursor: hasMore && lastItem ? lastItem.id : null,
      hasMore,
      pageSize,
    }, requestId);
  });
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.ANNOUNCEMENT_CREATE);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      throw new ValidationError('Invalid JSON request body.');
    }

    const parsed = createAnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid announcement request data.',
        parsed.error.flatten().fieldErrors as Record<string, unknown>,
      );
    }

    const repo = new PrismaAnnouncementRepository();
    const useCase = new CreateAnnouncementUseCase(repo);

    const announcement = await useCase.execute(ctx, {
      targetType: parsed.data.targetType,
      targetBatchId: parsed.data.targetBatchId,
      title: parsed.data.title,
      content: parsed.data.content,
    });

    return apiSuccess(announcement, requestId, 201);
  });
}

export async function PUT() { return methodNotAllowed(['GET', 'POST']); }
export async function PATCH() { return methodNotAllowed(['GET', 'POST']); }
export async function DELETE() { return methodNotAllowed(['GET', 'POST']); }
