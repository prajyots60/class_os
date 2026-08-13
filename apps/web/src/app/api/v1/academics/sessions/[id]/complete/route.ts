/**
 * REST API for complete session state transition
 * POST /api/v1/academics/sessions/[id]/complete
 */
import { type NextRequest } from 'next/server';
import {
  CompleteBatchSessionUseCase,
  PrismaBatchSessionRepository,
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
    const sessionRepo = new PrismaBatchSessionRepository();
    const useCase = new CompleteBatchSessionUseCase(sessionRepo);

    const completed = await useCase.execute(ctx, id);
    return apiSuccess(completed, requestId, 200);
  });
}

export async function GET() { return methodNotAllowed(['POST']); }
export async function PUT() { return methodNotAllowed(['POST']); }
export async function PATCH() { return methodNotAllowed(['POST']); }
export async function DELETE() { return methodNotAllowed(['POST']); }
