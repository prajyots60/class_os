/**
 * GET /api/v1/guardians/[id] — Get single guardian (tenant-scoped)
 */
import { type NextRequest } from 'next/server';
import {
  GetInstituteParentUseCase,
  PrismaInstituteParentRepository,
  PrismaParentIdentityRepository,
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
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.GUARDIAN_READ);

    const { id } = await params;
    const paramParse = uuidParamSchema.safeParse({ id });
    if (!paramParse.success) {
      throw new ValidationError('Invalid guardian ID format.', paramParse.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const parentRepo = new PrismaInstituteParentRepository();
    const parentIdentityRepo = new PrismaParentIdentityRepository();
    const useCase = new GetInstituteParentUseCase(parentRepo, parentIdentityRepo);

    const guardian = await useCase.execute(ctx, { id: paramParse.data.id });
    return apiSuccess(guardian, requestId);
  });
}

export async function POST() { return methodNotAllowed(['GET']); }
export async function PUT() { return methodNotAllowed(['GET']); }
export async function PATCH() { return methodNotAllowed(['GET']); }
export async function DELETE() { return methodNotAllowed(['GET']); }
