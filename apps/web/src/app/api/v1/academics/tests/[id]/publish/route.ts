/**
 * REST API for test results publication
 * POST /api/v1/academics/tests/[id]/publish — Publish test results
 */
import { type NextRequest } from 'next/server';
import {
  PrismaTestRepository,
  PublishTestResultsUseCase,
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
    const testRepo = new PrismaTestRepository();
    const useCase = new PublishTestResultsUseCase(testRepo);

    const published = await useCase.execute(ctx, id);
    return apiSuccess(published, requestId, 200);
  });
}

export async function GET() { return methodNotAllowed(['POST']); }
export async function PUT() { return methodNotAllowed(['POST']); }
export async function PATCH() { return methodNotAllowed(['POST']); }
export async function DELETE() { return methodNotAllowed(['POST']); }
