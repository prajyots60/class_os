/**
 * GET /api/v1/students/[id]/activities/[activityId] — Get single activity detail (tenant-scoped)
 * POST   — 405
 * PUT    — 405
 * PATCH  — 405
 * DELETE — 405
 */
import { type NextRequest } from 'next/server';
import {
  AuthorizationEngine,
  CAPABILITIES,
  PrismaStudentRepository,
} from '@coaching-os/identity';
import {
  PrismaActivityRepository,
  GetActivityUseCase,
} from '@coaching-os/communication';
import { ValidationError, NotFoundError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import {
  withV1ReadGuard,
  apiSuccess,
  methodNotAllowed,
} from '../../../../_lib/v1-guard';
import { z } from 'zod';

const activityParamSchema = z.object({
  id: z.string().uuid('Invalid student ID format'),
  activityId: z.string().uuid('Invalid activity ID format'),
});

interface RouteContext {
  params: Promise<{ id: string; activityId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.ACTIVITY_READ);

    const { id, activityId } = await params;
    const paramParse = activityParamSchema.safeParse({ id, activityId });
    if (!paramParse.success) {
      throw new ValidationError(
        'Invalid path parameters.',
        paramParse.error.flatten().fieldErrors as Record<string, unknown>,
      );
    }

    // Verify student belongs to server-authoritative tenant (404 masking)
    const studentRepo = new PrismaStudentRepository();
    const student = await studentRepo.findById(ctx.instituteId, id);
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    const activityRepo = new PrismaActivityRepository();
    const useCase = new GetActivityUseCase(activityRepo);

    const activity = await useCase.execute({
      instituteId: ctx.instituteId,
      studentId: id,
      activityId,
      userCapabilities: AuthorizationEngine.getCapabilitiesForRole(ctx.role),
    });

    return apiSuccess(activity, requestId);
  });
}

export async function POST() { return methodNotAllowed(['GET']); }
export async function PUT() { return methodNotAllowed(['GET']); }
export async function PATCH() { return methodNotAllowed(['GET']); }
export async function DELETE() { return methodNotAllowed(['GET']); }
