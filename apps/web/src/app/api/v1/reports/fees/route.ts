import { type NextRequest } from 'next/server';
import { apiSuccess, methodNotAllowed, withV1ReadGuard } from '../../_lib/v1-guard';
import { generateRequestId } from '@coaching-os/observability';
import { AuthorizationError } from '@coaching-os/shared';
import {
  GetFeeCollectionReportUseCase,
  PrismaReportsReadRepository,
} from '@coaching-os/administration';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();

  return withV1ReadGuard(req, requestId, async (ctx) => {
    if (ctx.role === 'teacher' || ctx.role === 'parent') {
      throw new AuthorizationError(`${ctx.role} role is not authorized to access financial collection reports.`);
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const paymentMode = searchParams.get('paymentMode') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined;
    const sortBy = searchParams.get('sortBy') || undefined;
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined;

    const repository = new PrismaReportsReadRepository();
    const useCase = new GetFeeCollectionReportUseCase(repository);

    const dto = await useCase.execute({
      instituteId: ctx.instituteId,
      userRole: ctx.role,
      from,
      to,
      paymentMode,
      search,
      page,
      pageSize,
      sortBy,
      sortOrder,
    });

    return apiSuccess(dto, requestId);
  });
}

export async function POST() {
  return methodNotAllowed(['GET']);
}

export async function PUT() {
  return methodNotAllowed(['GET']);
}

export async function PATCH() {
  return methodNotAllowed(['GET']);
}

export async function DELETE() {
  return methodNotAllowed(['GET']);
}
