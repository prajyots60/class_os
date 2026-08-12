/**
 * GET /api/v1/enrollments  — List enrollments (tenant-scoped, teacher-scoped, parent-denied)
 */
import { type NextRequest } from 'next/server';
import {
  ListEnrollmentsUseCase,
  PrismaEnrollmentRepository,
  PrismaBatchRepository,
  AuthorizationEngine,
  CAPABILITIES,
  type EnrollmentStatus,
} from '@coaching-os/identity';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import { withV1ReadGuard, apiCollection, methodNotAllowed } from '../_lib/v1-guard';
import { v1ListEnrollmentsQuerySchema } from '../_lib/v1-validators';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.ENROLLMENT_READ);

    const { searchParams } = new URL(req.url);
    const raw = {
      studentId: searchParams.get('studentId') ?? undefined,
      batchId: searchParams.get('batchId') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    };

    const parsed = v1ListEnrollmentsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters.', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const enrollmentRepo = new PrismaEnrollmentRepository();
    const batchRepo = new PrismaBatchRepository();
    // Teacher resource scope handled by ListEnrollmentsUseCase internally
    const useCase = new ListEnrollmentsUseCase(enrollmentRepo, batchRepo);

    const enrollments = await useCase.execute(ctx, {
      studentId: parsed.data.studentId,
      batchId: parsed.data.batchId,
      status: parsed.data.status as EnrollmentStatus | undefined,
      limit: parsed.data.limit,
    });

    const pageSize = parsed.data.limit ?? enrollments.length;
    const hasMore = enrollments.length === pageSize;
    const lastItem = enrollments.length > 0 ? enrollments[enrollments.length - 1] : null;

    return apiCollection(enrollments, {
      cursor: parsed.data.cursor ?? null,
      nextCursor: hasMore && lastItem ? lastItem.id : null,
      hasMore,
      pageSize,
      total: enrollments.length,
    }, requestId);
  });
}

export async function POST() { return methodNotAllowed(['GET']); }
export async function PUT() { return methodNotAllowed(['GET']); }
export async function PATCH() { return methodNotAllowed(['GET']); }
export async function DELETE() { return methodNotAllowed(['GET']); }
