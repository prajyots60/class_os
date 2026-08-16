import { generateRequestId } from '@coaching-os/observability';
import { type NextRequest } from 'next/server';
import { db } from '@coaching-os/database';
import { NotFoundError } from '@coaching-os/shared';
import {
  withParentAuthGuard,
  apiCollection,
  methodNotAllowed,
} from '../../_lib/v1-guard';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();

  return withParentAuthGuard(req, requestId, async (parentCtx) => {
    // 1. Resolve all active student linkages for the authenticated parent
    const links = await db.instituteParentStudent.findMany({
      where: {
        instituteParent: {
          parentIdentityId: parentCtx.parentIdentityId,
          status: 'active',
        },
        status: 'active',
      },
      select: {
        studentId: true,
        instituteId: true,
      },
    });

    if (links.length === 0) {
      return apiCollection(
        [],
        { cursor: null, nextCursor: null, hasMore: false, pageSize: 0 },
        requestId,
      );
    }

    const { searchParams } = new URL(req.url);
    const filterStudentId = searchParams.get('studentId') || undefined;
    const cursor = searchParams.get('cursor') || undefined;
    const rawLimit = Number(searchParams.get('limit') || 20);
    const limit = Math.min(Math.max(1, rawLimit), 50);

    // 2. Validate optional student filter against authorized linkages
    if (filterStudentId) {
      const isAuthorized = links.some((l) => l.studentId === filterStudentId);
      if (!isAuthorized) {
        throw new NotFoundError(
          `Student "${filterStudentId}" not found or unauthorized.`,
        );
      }
    }

    const targetPairs = filterStudentId
      ? links.filter((l) => l.studentId === filterStudentId)
      : links;

    // 3. Query activities matching authorized (instituteId, studentId) pairs
    const whereCondition = {
      OR: targetPairs.map((p) => ({
        instituteId: p.instituteId,
        studentId: p.studentId,
      })),
    };

    const rawActivities = await db.activity.findMany({
      where: whereCondition,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      include: {
        student: { select: { firstName: true, lastName: true } },
        institute: { select: { name: true } },
      },
    });

    const hasMore = rawActivities.length > limit;
    const items = hasMore ? rawActivities.slice(0, limit) : rawActivities;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const timelineItems = items.map((act) => ({
      id: act.id,
      instituteId: act.instituteId,
      instituteName: act.institute.name,
      studentId: act.studentId,
      studentName: `${act.student.firstName} ${act.student.lastName}`.trim(),
      eventType: act.eventType,
      title: act.title,
      description: act.description,
      occurredAt: act.occurredAt.toISOString(),
      actorName: act.actorName,
      metadata: act.metadata,
    }));

    return apiCollection(
      timelineItems,
      {
        cursor: cursor ?? null,
        nextCursor,
        hasMore,
        pageSize: limit,
      },
      requestId,
    );
  });
}

export async function POST() {
  return methodNotAllowed(['GET']);
}

export async function PATCH() {
  return methodNotAllowed(['GET']);
}

export async function DELETE() {
  return methodNotAllowed(['GET']);
}
