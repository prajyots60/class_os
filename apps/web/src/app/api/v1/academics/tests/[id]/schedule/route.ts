/**
 * REST API for test scheduling transition
 * POST /api/v1/academics/tests/[id]/schedule — Schedule test date
 */
import { type NextRequest } from 'next/server';
import {
  PrismaTestRepository,
  ScheduleTestUseCase,
} from '@coaching-os/academics';
import { ValidationError } from '@coaching-os/shared';
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
    const body = await req.json();
    if (!body || !body.scheduledDate) {
      throw new ValidationError('Scheduled date is required');
    }

    const testRepo = new PrismaTestRepository();
    const useCase = new ScheduleTestUseCase(testRepo);

    const scheduled = await useCase.execute(ctx, id, body.scheduledDate);
    return apiSuccess(scheduled, requestId, 200);
  });
}

export async function GET() { return methodNotAllowed(['POST']); }
export async function PUT() { return methodNotAllowed(['POST']); }
export async function PATCH() { return methodNotAllowed(['POST']); }
export async function DELETE() { return methodNotAllowed(['POST']); }
