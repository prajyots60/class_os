/**
 * GET /api/v1/students/[id]/guardians — List guardians for a student (tenant-scoped)
 */
import { type NextRequest } from 'next/server';
import {
  ListStudentGuardiansUseCase,
  PrismaInstituteParentStudentRepository,
  PrismaStudentRepository,
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

    const { id: studentId } = await params;
    const paramParse = uuidParamSchema.safeParse({ id: studentId });
    if (!paramParse.success) {
      throw new ValidationError('Invalid student ID format.', paramParse.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const relationshipRepo = new PrismaInstituteParentStudentRepository();
    const studentRepo = new PrismaStudentRepository();
    const useCase = new ListStudentGuardiansUseCase(relationshipRepo, studentRepo);

    const guardians = await useCase.execute(ctx, paramParse.data.id);

    return apiCollection(guardians, {
      cursor: null,
      nextCursor: null,
      hasMore: false,
      pageSize: guardians.length,
      total: guardians.length,
    }, requestId);
  });
}

export async function POST() { return methodNotAllowed(['GET']); }
export async function PUT() { return methodNotAllowed(['GET']); }
export async function PATCH() { return methodNotAllowed(['GET']); }
export async function DELETE() { return methodNotAllowed(['GET']); }
