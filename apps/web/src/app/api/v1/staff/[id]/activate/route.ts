/**
 * POST /api/v1/staff/[id]/activate — Activate staff member.
 */
import { type NextRequest } from 'next/server';
import {
  ChangeStaffStatusUseCase,
  PrismaInstituteMembershipRepository,
  toStaffMembershipDTO,
} from '@coaching-os/identity';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import { withV1MutationGuard, apiSuccess, methodNotAllowed } from '../../../_lib/v1-guard';
import { staffParamSchema } from '../../../_lib/v1-validators';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    const { id } = await params;
    const paramParse = staffParamSchema.safeParse({ id });
    if (!paramParse.success) {
      throw new ValidationError('Invalid staff membership ID format.', paramParse.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const repo = new PrismaInstituteMembershipRepository();
    const useCase = new ChangeStaffStatusUseCase(repo);

    const updated = await useCase.execute({
      id: paramParse.data.id,
      status: 'active',
      tenantContext: ctx,
    });

    return apiSuccess(toStaffMembershipDTO(updated), requestId);
  });
}

export async function GET() { return methodNotAllowed(['POST']); }
export async function PUT() { return methodNotAllowed(['POST']); }
export async function PATCH() { return methodNotAllowed(['POST']); }
export async function DELETE() { return methodNotAllowed(['POST']); }
