/**
 * REST API for Session Attendance Core
 * GET  /api/v1/academics/attendance?sessionId=... — Get attendance for session
 * POST /api/v1/academics/attendance — Record bulk attendance
 */
import { type NextRequest } from 'next/server';
import {
  GetSessionAttendanceUseCase,
  PrismaAttendanceRepository,
  PrismaBatchSessionRepository,
  RecordSessionAttendanceUseCase,
  getSessionAttendanceSchema,
  recordSessionAttendanceSchema,
} from '@coaching-os/academics';
import { PrismaEnrollmentRepository } from '@coaching-os/identity';
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
    const rawSessionId = req.nextUrl.searchParams.get('sessionId');

    const parsed = getSessionAttendanceSchema.safeParse({ sessionId: rawSessionId });
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameter sessionId', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const attendanceRepo = new PrismaAttendanceRepository();
    const sessionRepo = new PrismaBatchSessionRepository();
    const useCase = new GetSessionAttendanceUseCase(attendanceRepo, sessionRepo);

    const list = await useCase.execute(ctx, parsed.data.sessionId);
    return apiCollection(list, { cursor: null, nextCursor: null, hasMore: false, pageSize: list.length, total: list.length }, requestId);
  });
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    const body = await req.json();
    const parsed = recordSessionAttendanceSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const attendanceRepo = new PrismaAttendanceRepository();
    const sessionRepo = new PrismaBatchSessionRepository();
    const enrollmentRepo = new PrismaEnrollmentRepository();
    const useCase = new RecordSessionAttendanceUseCase(attendanceRepo, sessionRepo, enrollmentRepo);

    const result = await useCase.execute(ctx, parsed.data);
    return apiSuccess(result, requestId, 200);
  });
}

export async function PUT() { return methodNotAllowed(['GET', 'POST']); }
export async function PATCH() { return methodNotAllowed(['GET', 'POST']); }
export async function DELETE() { return methodNotAllowed(['GET', 'POST']); }
