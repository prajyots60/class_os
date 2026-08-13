/**
 * REST API for individual homework resource
 * GET    /api/v1/academics/homework/[id] — Get homework details
 * PATCH  /api/v1/academics/homework/[id] — Update draft homework
 * DELETE /api/v1/academics/homework/[id] — Delete homework
 */
import { type NextRequest } from 'next/server';
import {
  DeleteHomeworkUseCase,
  GetHomeworkUseCase,
  PrismaHomeworkRepository,
  UpdateHomeworkUseCase,
  updateHomeworkSchema,
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
    const homeworkRepo = new PrismaHomeworkRepository();
    const useCase = new GetHomeworkUseCase(homeworkRepo);

    const homework = await useCase.execute(ctx, id);
    return apiSuccess(homework, requestId, 200);
  });
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    const body = await req.json();
    const parsed = updateHomeworkSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const homeworkRepo = new PrismaHomeworkRepository();
    const useCase = new UpdateHomeworkUseCase(homeworkRepo);

    const updated = await useCase.execute(ctx, id, parsed.data);
    return apiSuccess(updated, requestId, 200);
  });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    const homeworkRepo = new PrismaHomeworkRepository();
    const useCase = new DeleteHomeworkUseCase(homeworkRepo);

    const result = await useCase.execute(ctx, id);
    return apiSuccess({ deleted: result }, requestId, 200);
  });
}

export async function POST() { return methodNotAllowed(['GET', 'PATCH', 'DELETE']); }
export async function PUT() { return methodNotAllowed(['GET', 'PATCH', 'DELETE']); }
