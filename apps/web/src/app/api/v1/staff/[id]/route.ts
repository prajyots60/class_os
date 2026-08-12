/**
 * GET /api/v1/staff/[id] — Get single staff membership (tenant-scoped)
 */
import { type NextRequest } from 'next/server';
import {
  GetInstituteMembershipUseCase,
  PrismaInstituteMembershipRepository,
  AuthorizationEngine,
  CAPABILITIES,
  toStaffMembershipDTO,
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
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.STAFF_READ);

    const { id } = await params;
    const paramParse = uuidParamSchema.safeParse({ id });
    if (!paramParse.success) {
      throw new ValidationError('Invalid staff membership ID format.', paramParse.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const repo = new PrismaInstituteMembershipRepository();
    const useCase = new GetInstituteMembershipUseCase(repo);

    const membership = await useCase.execute({
      id: paramParse.data.id,
      tenantContext: ctx,
    });

    // Map to safe DTO (no password/MFA/OAuth/session fields)
    return apiSuccess(toStaffMembershipDTO(membership), requestId);
  });
}

export async function POST() { return methodNotAllowed(['GET']); }
export async function PUT() { return methodNotAllowed(['GET']); }
export async function PATCH() { return methodNotAllowed(['GET']); }
export async function DELETE() { return methodNotAllowed(['GET']); }
