/**
 * REST API for individual test assessment resource
 * GET    /api/v1/academics/tests/[id] — Get test details
 * PATCH  /api/v1/academics/tests/[id] — Update draft test details
 * DELETE /api/v1/academics/tests/[id] — Delete test
 */
import { type NextRequest } from 'next/server';
import {
  DeleteTestUseCase,
  GetTestUseCase,
  PrismaTestRepository,
  UpdateTestUseCase,
  updateTestSchema,
} from '@coaching-os/academics';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import {
  apiSuccess,
  methodNotAllowed,
  withV1MutationGuard,
  withV1ReadGuard,
} from '../../../_lib/v1-guard';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    const testRepo = new PrismaTestRepository();
    const useCase = new GetTestUseCase(testRepo);

    const test = await useCase.execute(ctx, id);
    return apiSuccess(test, requestId, 200);
  });
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    const body = await req.json();
    const parsed = updateTestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const testRepo = new PrismaTestRepository();
    const useCase = new UpdateTestUseCase(testRepo);

    const updated = await useCase.execute(ctx, id, parsed.data);
    return apiSuccess(updated, requestId, 200);
  });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    const testRepo = new PrismaTestRepository();
    const useCase = new DeleteTestUseCase(testRepo);

    const result = await useCase.execute(ctx, id);
    return apiSuccess({ deleted: result }, requestId, 200);
  });
}

export async function POST() { return methodNotAllowed(['GET', 'PATCH', 'DELETE']); }
export async function PUT() { return methodNotAllowed(['GET', 'PATCH', 'DELETE']); }
