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
    const raw = {
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      admissionStatus: searchParams.get('admissionStatus') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    };

    const parsed = v1ListStudentsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters.', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const repo = new PrismaStudentRepository();
    const useCase = new ListStudentsUseCase(repo);

    const students = await useCase.execute(ctx, {
      search: parsed.data.search,
      status: parsed.data.status,
      admissionStatus: parsed.data.admissionStatus,
      limit: parsed.data.limit,
    });

    const pageSize = parsed.data.limit ?? students.length;
    const hasMore = students.length === pageSize;
    const lastItem = students.length > 0 ? students[students.length - 1] : null;

    return apiCollection(students, {
      cursor: parsed.data.cursor ?? null,
      nextCursor: hasMore && lastItem ? lastItem.id : null,
      hasMore,
      pageSize,
      total: students.length,
    }, requestId);
  });
}

export async function POST() { return methodNotAllowed(['GET']); }
export async function PUT() { return methodNotAllowed(['GET']); }
export async function PATCH() { return methodNotAllowed(['GET']); }
export async function DELETE() { return methodNotAllowed(['GET']); }
