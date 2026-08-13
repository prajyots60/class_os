/**
 * REST API for Academics Batch Sessions
 * GET /api/v1/academics/sessions?batchId=... — List batch sessions
 */
import { type NextRequest } from 'next/server';
import {
  ListBatchSessionsUseCase,
  PrismaBatchSessionRepository,
  listBatchSessionsSchema,
} from '@coaching-os/academics';
import { PrismaBatchRepository } from '@coaching-os/identity';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import {
  apiCollection,
  methodNotAllowed,
  withV1ReadGuard,
} from '../../_lib/v1-guard';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    const raw = {
      batchId: req.nextUrl.searchParams.get('batchId') ?? undefined,
      startDate: req.nextUrl.searchParams.get('startDate') ?? undefined,
      endDate: req.nextUrl.searchParams.get('endDate') ?? undefined,
    };

    const parsed = listBatchSessionsSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const batchRepo = new PrismaBatchRepository();
    const sessionRepo = new PrismaBatchSessionRepository();
    const useCase = new ListBatchSessionsUseCase(batchRepo, sessionRepo);

    const list = await useCase.execute(ctx, parsed.data);
    return apiCollection(list, { cursor: null, nextCursor: null, hasMore: false, pageSize: list.length, total: list.length }, requestId);
  });
}

export async function POST() { return methodNotAllowed(['GET']); }
export async function PUT() { return methodNotAllowed(['GET']); }
export async function PATCH() { return methodNotAllowed(['GET']); }
export async function DELETE() { return methodNotAllowed(['GET']); }
