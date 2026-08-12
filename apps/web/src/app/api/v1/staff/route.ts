/**
 * GET /api/v1/staff — List staff memberships (tenant-scoped)
 */
import { type NextRequest } from 'next/server';
import {
  GetInstituteMembersUseCase,
  PrismaInstituteMembershipRepository,
  AuthorizationEngine,
  CAPABILITIES,
  toStaffMembershipDTO,
} from '@coaching-os/identity';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import { withV1ReadGuard, apiCollection, methodNotAllowed } from '../_lib/v1-guard';
import { v1ListStaffQuerySchema } from '../_lib/v1-validators';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.STAFF_READ);

    const { searchParams } = new URL(req.url);
    const raw = {
      role: searchParams.get('role') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    };

    const parsed = v1ListStaffQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters.', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const repo = new PrismaInstituteMembershipRepository();
    const useCase = new GetInstituteMembersUseCase(repo);

    const members = await useCase.execute({
      instituteId: ctx.instituteId,
      tenantContext: ctx,
    });

    // Filter by role/status query if provided (application layer already tenant-scoped)
    const filtered = members.filter((m) => {
      if (parsed.data.role && m.role !== parsed.data.role) return false;
      if (parsed.data.status && m.status !== parsed.data.status) return false;
      return true;
    });

    // Map to safe StaffMembershipDTO (strips passwords/secrets)
    const dtos = filtered.map((m) => toStaffMembershipDTO(m));

    const pageSize = parsed.data.limit;
    const page = dtos.slice(0, pageSize);
    const hasMore = dtos.length > pageSize;
    const lastItem = page.length > 0 ? page[page.length - 1] : null;

    return apiCollection(page, {
      cursor: parsed.data.cursor ?? null,
      nextCursor: hasMore && lastItem ? lastItem.id : null,
      hasMore,
      pageSize,
      total: dtos.length,
    }, requestId);
  });
}

export async function POST() { return methodNotAllowed(['GET']); }
export async function PUT() { return methodNotAllowed(['GET']); }
export async function PATCH() { return methodNotAllowed(['GET']); }
export async function DELETE() { return methodNotAllowed(['GET']); }
