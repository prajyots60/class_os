/**
 * REST API for individual schedule
 * PATCH  /api/v1/academics/schedules/[id] — Update schedule
 * DELETE /api/v1/academics/schedules/[id]?batchId=... — Delete schedule
 */
import { type NextRequest } from 'next/server';
import {
  DeleteScheduleUseCase,
  PrismaScheduleRepository,
  UpdateScheduleUseCase,
  updateScheduleSchema,
} from '@coaching-os/academics';
import {
  PrismaBatchRepository,
  PrismaInstituteMembershipRepository,
} from '@coaching-os/identity';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import {
  apiSuccess,
  methodNotAllowed,
  withV1MutationGuard,
} from '../../../_lib/v1-guard';

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    const body = await req.json();
    const parsed = updateScheduleSchema.safeParse({ ...body, scheduleId: id });
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const scheduleRepo = new PrismaScheduleRepository();
    const batchRepo = new PrismaBatchRepository();
    const membershipRepo = new PrismaInstituteMembershipRepository();
    const useCase = new UpdateScheduleUseCase(scheduleRepo, batchRepo, membershipRepo);

    const updated = await useCase.execute(ctx, parsed.data);
    return apiSuccess(updated, requestId, 200);
  });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    const batchId = req.nextUrl.searchParams.get('batchId') ?? '';
    if (!batchId) {
      throw new ValidationError('Query parameter batchId is required to delete schedule.');
    }

    const scheduleRepo = new PrismaScheduleRepository();
    const batchRepo = new PrismaBatchRepository();
    const useCase = new DeleteScheduleUseCase(scheduleRepo, batchRepo);

    await useCase.execute(ctx, batchId, id);
    return apiSuccess({ deleted: true }, requestId, 200);
  });
}

export async function GET() { return methodNotAllowed(['PATCH', 'DELETE']); }
export async function POST() { return methodNotAllowed(['PATCH', 'DELETE']); }
export async function PUT() { return methodNotAllowed(['PATCH', 'DELETE']); }
