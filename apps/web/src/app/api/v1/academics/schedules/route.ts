/**
 * REST API for Academics Schedules
 * GET  /api/v1/academics/schedules?batchId=... — List schedules for batch
 * POST /api/v1/academics/schedules — Create weekly recurring schedule
 */
import { type NextRequest } from 'next/server';
import {
  CreateScheduleUseCase,
  ListSchedulesForBatchUseCase,
  PrismaScheduleRepository,
  createScheduleSchema,
  listSchedulesForBatchSchema,
} from '@coaching-os/academics';
import {
  PrismaBatchRepository,
  PrismaInstituteMembershipRepository,
} from '@coaching-os/identity';
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

    const parsed = listSchedulesForBatchSchema.safeParse({ batchId: rawBatchId });
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameter batchId', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const scheduleRepo = new PrismaScheduleRepository();
    const batchRepo = new PrismaBatchRepository();
    const useCase = new ListSchedulesForBatchUseCase(scheduleRepo, batchRepo);

    const list = await useCase.execute(ctx, parsed.data.batchId);
    return apiCollection(list, { cursor: null, nextCursor: null, hasMore: false, pageSize: list.length, total: list.length }, requestId);
  });
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    const body = await req.json();
    const parsed = createScheduleSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const scheduleRepo = new PrismaScheduleRepository();
    const batchRepo = new PrismaBatchRepository();
    const membershipRepo = new PrismaInstituteMembershipRepository();
    const useCase = new CreateScheduleUseCase(scheduleRepo, batchRepo, membershipRepo);

    const schedule = await useCase.execute(ctx, parsed.data);
    return apiSuccess(schedule, requestId, 201);
  });
}

export async function PUT() { return methodNotAllowed(['GET', 'POST']); }
export async function PATCH() { return methodNotAllowed(['GET', 'POST']); }
export async function DELETE() { return methodNotAllowed(['GET', 'POST']); }
