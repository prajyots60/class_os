import { type NextRequest } from 'next/server';
import { generateRequestId } from '@coaching-os/observability';
import {
  GlobalSearchUseCase,
  PrismaGlobalSearchRepository,
} from '@coaching-os/administration';
import {
  withV1ReadGuard,
  apiSuccess,
  methodNotAllowed,
} from '../_lib/v1-guard';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();

  return withV1ReadGuard(req, requestId, async (ctx) => {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    const repository = new PrismaGlobalSearchRepository();
    const useCase = new GlobalSearchUseCase(repository);

    const dto = await useCase.execute({
      query,
      instituteId: ctx.instituteId,
      authenticatedUserId: ctx.userId,
    });

    return apiSuccess(dto, requestId);
  });
}

export async function POST() {
  return methodNotAllowed(['GET']);
}

export async function PUT() {
  return methodNotAllowed(['GET']);
}

export async function PATCH() {
  return methodNotAllowed(['GET']);
}

export async function DELETE() {
  return methodNotAllowed(['GET']);
}
