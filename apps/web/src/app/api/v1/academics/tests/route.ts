/**
 * REST API for Academics Tests / Assessments
 * GET  /api/v1/academics/tests?batchId=... — List tests for batch
 * POST /api/v1/academics/tests — Create draft test
 */
import { type NextRequest } from 'next/server';
import {
  CreateTestUseCase,
  ListTestsForBatchUseCase,
  PrismaTestRepository,
  createTestSchema,
  listTestsForBatchSchema,
} from '@coaching-os/academics';
import { PrismaBatchRepository } from '@coaching-os/identity';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import {
  apiCollection,
  apiSuccess,
  methodNotAllowed,
  withV1MutationGuard,
  withV1ReadGuard,
} from '../../_lib/v1-guard';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    const rawBatchId = req.nextUrl.searchParams.get('batchId');

    const parsed = listTestsForBatchSchema.safeParse({ batchId: rawBatchId });
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameter batchId', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const testRepo = new PrismaTestRepository();
    const batchRepo = new PrismaBatchRepository();
    const useCase = new ListTestsForBatchUseCase(testRepo, batchRepo);

    const list = await useCase.execute(ctx, parsed.data.batchId);
    return apiCollection(list, { cursor: null, nextCursor: null, hasMore: false, pageSize: list.length, total: list.length }, requestId);
  });
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    const body = await req.json();
    const parsed = createTestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const testRepo = new PrismaTestRepository();
    const batchRepo = new PrismaBatchRepository();
    const useCase = new CreateTestUseCase(testRepo, batchRepo);

    const created = await useCase.execute(ctx, parsed.data);
    return apiSuccess(created, requestId, 201);
  });
}

export async function PUT() { return methodNotAllowed(['GET', 'POST']); }
export async function PATCH() { return methodNotAllowed(['GET', 'POST']); }
export async function DELETE() { return methodNotAllowed(['GET', 'POST']); }
