/**
 * REST API for Academics Batch Sessions
 * GET /api/v1/academics/sessions — List batch sessions with operational table support
 */
import { type NextRequest } from 'next/server';
import { PrismaBatchSessionRepository } from '@coaching-os/academics';
import { PrismaBatchRepository } from '@coaching-os/identity';
import { ValidationError, AuthorizationError, NotFoundError } from '@coaching-os/shared';

import { generateRequestId } from '@coaching-os/observability';
import {
  apiCollection,
  methodNotAllowed,
  withV1ReadGuard,
} from '../../_lib/v1-guard';
import { v1ListSessionsQuerySchema } from '../../_lib/v1-validators';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    // Role Authorization Guard: Block Parent role from staff operational sessions table
    if (ctx.role === 'parent') {
      throw new AuthorizationError('Parent identity is not authorized to access staff operational sessions.');
    }

    const { searchParams } = new URL(req.url);
    const raw = {
      batchId: searchParams.get('batchId') ?? undefined,
      subjectId: searchParams.get('subjectId') ?? undefined,
      teacherId: searchParams.get('teacherId') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      attendanceStatus: searchParams.get('attendanceStatus') ?? undefined,
      startDate: searchParams.get('startDate') ?? undefined,
      endDate: searchParams.get('endDate') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? searchParams.get('limit') ?? undefined,
      sortBy: searchParams.get('sortBy') ?? undefined,
      sortOrder: searchParams.get('sortOrder') ?? undefined,
    };

    const parsed = v1ListSessionsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid query parameters.',
        parsed.error.flatten().fieldErrors as Record<string, unknown>,
      );
    }

    const sessionRepo = new PrismaBatchSessionRepository();

    if (parsed.data.batchId) {
      const batchRepo = new PrismaBatchRepository();
      const batch = await batchRepo.findById(ctx.instituteId, parsed.data.batchId);
      if (!batch) {
        throw new NotFoundError(`Batch "${parsed.data.batchId}" not found in institute.`);
      }
    }

    // Teacher role scoping: restrict results to sessions where current user is teacher
    const teacherUserIdFilter = ctx.role === 'teacher' ? ctx.userId : undefined;


    const result = await sessionRepo.listSessions(ctx.instituteId, {
      batchId: parsed.data.batchId,
      subjectId: parsed.data.subjectId,
      teacherId: parsed.data.teacherId,
      status: parsed.data.status,
      attendanceStatus: parsed.data.attendanceStatus,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      search: parsed.data.search,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      sortBy: parsed.data.sortBy,
      sortOrder: parsed.data.sortOrder,
      teacherUserIdFilter,
    });

    const hasMore = result.page < result.totalPages;

    return apiCollection(
      result.items,
      {
        cursor: null,
        nextCursor: null,
        hasMore,
        pageSize: result.pageSize,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
      requestId,
    );
  });
}

export async function POST() {
  return methodNotAllowed(['GET']);
}
export async function PUT() {
  return methodNotAllowed(['GET']);
}
export async function PATCH() {
  return methodNotAllowed(['GET']);
}
export async function DELETE() {
  return methodNotAllowed(['GET']);
}
