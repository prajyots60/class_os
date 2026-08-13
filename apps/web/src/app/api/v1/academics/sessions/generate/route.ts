/**
 * REST API for Session Generation Engine
 * POST /api/v1/academics/sessions/generate — Generate candidate sessions from schedules
 */
import { type NextRequest } from 'next/server';
import {
  GenerateBatchSessionsUseCase,
  PrismaBatchSessionRepository,
  PrismaScheduleRepository,
  generateBatchSessionsSchema,
} from '@coaching-os/academics';
import { PrismaBatchRepository } from '@coaching-os/identity';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import {
  apiSuccess,
  methodNotAllowed,
  withV1MutationGuard,
} from '../../../_lib/v1-guard';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    const body = await req.json();
    const parsed = generateBatchSessionsSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const batchRepo = new PrismaBatchRepository();
    const scheduleRepo = new PrismaScheduleRepository();
    const sessionRepo = new PrismaBatchSessionRepository();
    const useCase = new GenerateBatchSessionsUseCase(batchRepo, scheduleRepo, sessionRepo);

    const generated = await useCase.execute(ctx, parsed.data);
    return apiSuccess(generated, requestId, 201);
  });
}

export async function GET() { return methodNotAllowed(['POST']); }
export async function PUT() { return methodNotAllowed(['POST']); }
export async function PATCH() { return methodNotAllowed(['POST']); }
export async function DELETE() { return methodNotAllowed(['POST']); }
