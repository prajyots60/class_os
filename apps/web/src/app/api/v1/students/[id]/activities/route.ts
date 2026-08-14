/**
 * GET /api/v1/students/[id]/activities — List student activity timeline (tenant-scoped)
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
  ListStudentActivitiesUseCase,
  listStudentActivitiesQuerySchema,
  type ActivityEventType,
} from '@coaching-os/communication';
import { ValidationError, NotFoundError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import {
  withV1ReadGuard,
  apiCollection,
  methodNotAllowed,
} from '../../../_lib/v1-guard';
import { uuidParamSchema } from '../../../_lib/v1-validators';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.ACTIVITY_READ);

    const { id } = await params;
    const paramParse = uuidParamSchema.safeParse({ id });
    if (!paramParse.success) {
      throw new ValidationError(
        'Invalid student ID format.',
        paramParse.error.flatten().fieldErrors as Record<string, unknown>,
      );
    }

    // Verify student belongs to server-authoritative tenant (404 masking)
    const studentRepo = new PrismaStudentRepository();
    const student = await studentRepo.findById(ctx.instituteId, id);
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    const { searchParams } = new URL(req.url);
    const raw = {
      studentId: id,
      eventType: searchParams.get('eventType') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    };

    const parsed = listStudentActivitiesQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid query parameters.',
        parsed.error.flatten().fieldErrors as Record<string, unknown>,
      );
    }

    const activityRepo = new PrismaActivityRepository();
    const useCase = new ListStudentActivitiesUseCase(activityRepo);

    const result = await useCase.execute({
      instituteId: ctx.instituteId,
      studentId: id,
      eventType: parsed.data.eventType as ActivityEventType | undefined,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
      userCapabilities: AuthorizationEngine.getCapabilitiesForRole(ctx.role),
    });

    const pageSize = parsed.data.limit ?? result.items.length;
    const hasMore = result.nextCursor !== null;

    return apiCollection(
      result.items,
      {
        cursor: parsed.data.cursor ?? null,
        nextCursor: result.nextCursor,
        hasMore,
        pageSize,
      },
      requestId,
    );
  });
}

export async function POST() { return methodNotAllowed(['GET']); }
export async function PUT() { return methodNotAllowed(['GET']); }
export async function PATCH() { return methodNotAllowed(['GET']); }
export async function DELETE() { return methodNotAllowed(['GET']); }
