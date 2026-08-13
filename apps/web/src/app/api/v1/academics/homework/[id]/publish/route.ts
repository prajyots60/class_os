/**
 * REST API for explicit homework publication
 * POST /api/v1/academics/homework/[id]/publish — Publish draft homework
 */
import { type NextRequest } from 'next/server';
import {
  PublishHomeworkUseCase,
  PrismaHomeworkRepository,
} from '@coaching-os/academics';
import { generateRequestId } from '@coaching-os/observability';
import {
  apiSuccess,
  methodNotAllowed,
  withV1MutationGuard,
} from '../../../../_lib/v1-guard';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    const homeworkRepo = new PrismaHomeworkRepository();
    const useCase = new PublishHomeworkUseCase(homeworkRepo);

    const published = await useCase.execute(ctx, id);
    return apiSuccess(published, requestId, 200);
  });
}

export async function GET() { return methodNotAllowed(['POST']); }
export async function PUT() { return methodNotAllowed(['POST']); }
export async function PATCH() { return methodNotAllowed(['POST']); }
export async function DELETE() { return methodNotAllowed(['POST']); }
