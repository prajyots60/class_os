/**
 * REST API for Assessment Marks
 * GET  /api/v1/academics/tests/[id]/marks — Get marks recorded for test
 * POST /api/v1/academics/tests/[id]/marks — Enter bulk test marks
 */
import { type NextRequest } from 'next/server';
import {
  EnterTestMarksUseCase,
  GetTestMarksUseCase,
  PrismaMarksRepository,
  PrismaTestRepository,
  enterTestMarksSchema,
} from '@coaching-os/academics';
import { PrismaEnrollmentRepository } from '@coaching-os/identity';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import {
  apiCollection,
  apiSuccess,
  methodNotAllowed,
  withV1MutationGuard,
  withV1ReadGuard,
} from '../../../../_lib/v1-guard';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    const testRepo = new PrismaTestRepository();
    const marksRepo = new PrismaMarksRepository();
    const useCase = new GetTestMarksUseCase(testRepo, marksRepo);

    const list = await useCase.execute(ctx, id);
    return apiCollection(list, { cursor: null, nextCursor: null, hasMore: false, pageSize: list.length, total: list.length }, requestId);
  });
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    const body = await req.json();
    const parsed = enterTestMarksSchema.safeParse({ ...body, testId: id });
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const testRepo = new PrismaTestRepository();
    const marksRepo = new PrismaMarksRepository();
    const enrollmentRepo = new PrismaEnrollmentRepository();
    const useCase = new EnterTestMarksUseCase(testRepo, marksRepo, enrollmentRepo);

    const result = await useCase.execute(ctx, parsed.data);
    return apiSuccess(result, requestId, 200);
  });
}

export async function PUT() { return methodNotAllowed(['GET', 'POST']); }
export async function PATCH() { return methodNotAllowed(['GET', 'POST']); }
export async function DELETE() { return methodNotAllowed(['GET', 'POST']); }
