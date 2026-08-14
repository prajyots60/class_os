/**
 * GET    /api/v1/communication/announcements/[id] — Get single announcement
 * PATCH  /api/v1/communication/announcements/[id] — Update draft announcement
 * DELETE /api/v1/communication/announcements/[id] — Delete draft announcement
 * POST — 405
 * PUT  — 405
 */
import { type NextRequest } from 'next/server';
import {
  AuthorizationEngine,
  CAPABILITIES,
} from '@coaching-os/identity';
import {
  PrismaAnnouncementRepository,
  GetAnnouncementUseCase,
  UpdateDraftAnnouncementUseCase,
  DeleteDraftAnnouncementUseCase,
  updateDraftAnnouncementSchema,
} from '@coaching-os/communication';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import {
  withV1ReadGuard,
  withV1MutationGuard,
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
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.ANNOUNCEMENT_READ);

    const { id } = await params;
    const paramParse = uuidParamSchema.safeParse({ id });
    if (!paramParse.success) {
      throw new ValidationError(
        'Invalid announcement ID format.',
        paramParse.error.flatten().fieldErrors as Record<string, unknown>,
      );
    }

    const repo = new PrismaAnnouncementRepository();
    const useCase = new GetAnnouncementUseCase(repo);

    const announcement = await useCase.execute(ctx, id);
    return apiSuccess(announcement, requestId);
  });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.ANNOUNCEMENT_UPDATE);

    const { id } = await params;
    const paramParse = uuidParamSchema.safeParse({ id });
    if (!paramParse.success) {
      throw new ValidationError(
        'Invalid announcement ID format.',
        paramParse.error.flatten().fieldErrors as Record<string, unknown>,
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      throw new ValidationError('Invalid JSON request body.');
    }

    const parsed = updateDraftAnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid update announcement data.',
        parsed.error.flatten().fieldErrors as Record<string, unknown>,
      );
    }

    const repo = new PrismaAnnouncementRepository();
    const useCase = new UpdateDraftAnnouncementUseCase(repo);

    const updated = await useCase.execute(ctx, id, {
      targetType: parsed.data.targetType,
      targetBatchId: parsed.data.targetBatchId,
      title: parsed.data.title,
      content: parsed.data.content,
    });

    return apiSuccess(updated, requestId);
  });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.ANNOUNCEMENT_DELETE);

    const { id } = await params;
    const paramParse = uuidParamSchema.safeParse({ id });
    if (!paramParse.success) {
      throw new ValidationError(
        'Invalid announcement ID format.',
        paramParse.error.flatten().fieldErrors as Record<string, unknown>,
      );
    }

    const repo = new PrismaAnnouncementRepository();
    const useCase = new DeleteDraftAnnouncementUseCase(repo);

    await useCase.execute(ctx, id);
    return apiSuccess({ id, deleted: true }, requestId);
  });
}

export async function POST() { return methodNotAllowed(['GET', 'PATCH', 'DELETE']); }
export async function PUT() { return methodNotAllowed(['GET', 'PATCH', 'DELETE']); }
