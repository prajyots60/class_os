/**
 * POST /api/v1/staff/invite — Explicit endpoint to invite a new staff member.
 */
import { type NextRequest } from 'next/server';
import {
  InviteStaffMemberUseCase,
  PrismaInstituteMembershipRepository,
  toStaffMembershipDTO,
} from '@coaching-os/identity';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import { withV1MutationGuard, apiSuccess, methodNotAllowed } from '../../_lib/v1-guard';
import { v1InviteStaffSchema } from '../../_lib/v1-validators';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Malformed JSON request body.');
    }

    const parsed = v1InviteStaffSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Validation failed for staff invitation payload.', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const repo = new PrismaInstituteMembershipRepository();
    const useCase = new InviteStaffMemberUseCase(repo);

    const created = await useCase.execute({
      userId: parsed.data.userId,
      role: parsed.data.role,
      tenantContext: ctx,
    });

    return apiSuccess(toStaffMembershipDTO(created), requestId, 201);
  });
}

export async function GET() { return methodNotAllowed(['POST']); }
export async function PUT() { return methodNotAllowed(['POST']); }
export async function PATCH() { return methodNotAllowed(['POST']); }
export async function DELETE() { return methodNotAllowed(['POST']); }
