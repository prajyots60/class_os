/**
 * GET  /api/v1/students  — List students (tenant-scoped)
 * POST — 405
 * PUT  — 405
 * DELETE — 405
 */
import { type NextRequest } from 'next/server';
import {
  ListStudentsUseCase,
  PrismaStudentRepository,
  AuthorizationEngine,
  CAPABILITIES,
} from '@coaching-os/identity';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import {
  withV1ReadGuard,
  apiCollection,
  methodNotAllowed,
} from '../_lib/v1-guard';
import { v1ListStudentsQuerySchema } from '../_lib/v1-validators';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.STUDENT_READ);

    const { searchParams } = new URL(req.url);
    const rawLimit = searchParams.get('limit') ?? undefined;
    const rawPageSize = searchParams.get('pageSize') ?? rawLimit;
    const raw = {
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      admissionStatus: searchParams.get('admissionStatus') ?? undefined,
      batchId: searchParams.get('batchId') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: rawLimit,
      page: searchParams.get('page') ?? undefined,
      pageSize: rawPageSize,
      sortBy: searchParams.get('sortBy') ?? undefined,
      sortOrder: searchParams.get('sortOrder') ?? undefined,
    };


    const parsed = v1ListStudentsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters.', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const repo = new PrismaStudentRepository();

    const result = await repo.listOperationalStudents(ctx.instituteId, {
      search: parsed.data.search,
      status: parsed.data.status,
      admissionStatus: parsed.data.admissionStatus,
      batchId: parsed.data.batchId,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize ?? parsed.data.limit,
      sortBy: parsed.data.sortBy,
      sortOrder: parsed.data.sortOrder,
    });

    const hasMore = result.page < result.totalPages;

    return apiCollection(result.items, {
      cursor: parsed.data.cursor ?? null,
      nextCursor: null,
      hasMore,
      pageSize: result.pageSize,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    }, requestId);

  });
}

export async function POST() { return methodNotAllowed(['GET']); }
export async function PUT() { return methodNotAllowed(['GET']); }
export async function PATCH() { return methodNotAllowed(['GET']); }
export async function DELETE() { return methodNotAllowed(['GET']); }
