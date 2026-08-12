/**
 * GET /api/v1/guardians/[id]/students — List students linked to a guardian (tenant-scoped)
 */
import { type NextRequest } from 'next/server';
import {
  ListParentStudentsUseCase,
  PrismaInstituteParentStudentRepository,
  PrismaInstituteParentRepository,
  AuthorizationEngine,
  CAPABILITIES,
} from '@coaching-os/identity';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import { withV1ReadGuard, apiCollection, methodNotAllowed } from '../../../_lib/v1-guard';
import { uuidParamSchema } from '../../../_lib/v1-validators';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.GUARDIAN_READ);

    const { id: guardianId } = await params;
    const paramParse = uuidParamSchema.safeParse({ id: guardianId });
    if (!paramParse.success) {
      throw new ValidationError('Invalid guardian ID format.', paramParse.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const relationshipRepo = new PrismaInstituteParentStudentRepository();
    const parentRepo = new PrismaInstituteParentRepository();
    const useCase = new ListParentStudentsUseCase(relationshipRepo, parentRepo);

    const students = await useCase.execute(ctx, paramParse.data.id);

    return apiCollection(students, {
      cursor: null,
      nextCursor: null,
      hasMore: false,
      pageSize: students.length,
      total: students.length,
    }, requestId);
  });
}

export async function POST() { return methodNotAllowed(['GET']); }
export async function PUT() { return methodNotAllowed(['GET']); }
export async function PATCH() { return methodNotAllowed(['GET']); }
export async function DELETE() { return methodNotAllowed(['GET']); }
