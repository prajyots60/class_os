/**
 * GET /api/v1/enrollments/[id] — Get single enrollment (tenant-scoped, teacher-scoped)
 */
import { type NextRequest } from 'next/server';
import {
  GetEnrollmentUseCase,
  PrismaEnrollmentRepository,
  PrismaBatchRepository,
  AuthorizationEngine,
  CAPABILITIES,
} from '@coaching-os/identity';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import { withV1ReadGuard, apiSuccess, methodNotAllowed } from '../../_lib/v1-guard';
import { uuidParamSchema } from '../../_lib/v1-validators';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.ENROLLMENT_READ);

    const { id } = await params;
    const paramParse = uuidParamSchema.safeParse({ id });
    if (!paramParse.success) {
      throw new ValidationError('Invalid enrollment ID format.', paramParse.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const enrollmentRepo = new PrismaEnrollmentRepository();
    const batchRepo = new PrismaBatchRepository();
    // Teacher scope enforced inside GetEnrollmentUseCase
    const useCase = new GetEnrollmentUseCase(enrollmentRepo, batchRepo);

    const enrollment = await useCase.execute(ctx, { id: paramParse.data.id });
    return apiSuccess(enrollment, requestId);
  });
}

export async function POST() { return methodNotAllowed(['GET']); }
export async function PUT() { return methodNotAllowed(['GET']); }
export async function PATCH() { return methodNotAllowed(['GET']); }
export async function DELETE() { return methodNotAllowed(['GET']); }
