import { generateRequestId } from '@coaching-os/observability';
import { type NextRequest } from 'next/server';
import { db } from '@coaching-os/database';
import {
  withParentAuthGuard,
  apiCollection,
  methodNotAllowed,
} from '../../_lib/v1-guard';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();

  return withParentAuthGuard(req, requestId, async (parentCtx) => {
    const { searchParams } = new URL(req.url);
    const rawIsRead = searchParams.get('isRead');
    const isReadFilter =
      rawIsRead === 'true' ? true : rawIsRead === 'false' ? false : undefined;
    const cursor = searchParams.get('cursor') || undefined;
    const rawLimit = Number(searchParams.get('limit') || 20);
    const limit = Math.min(Math.max(1, rawLimit), 50);

    const whereCondition = {
      recipientUserId: parentCtx.userId,
      ...(isReadFilter !== undefined ? { isRead: isReadFilter } : {}),
    };

    const rawNotifications = await db.notification.findMany({
      where: whereCondition,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        institute: { select: { name: true } },
      },
    });

    const hasMore = rawNotifications.length > limit;
    const items = hasMore ? rawNotifications.slice(0, limit) : rawNotifications;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const notificationItems = items.map((notif) => ({
      id: notif.id,
      instituteId: notif.instituteId,
      instituteName: notif.institute?.name ?? 'Coaching Institute',
      recipientUserId: notif.recipientUserId,
      recipientType: notif.recipientType,
      priority: notif.priority,
      category: notif.category,
      title: notif.title,
      message: notif.message,
      actionUrl: notif.actionUrl,
      isRead: notif.isRead,
      readAt: notif.readAt ? notif.readAt.toISOString() : null,
      createdAt: notif.createdAt.toISOString(),
      metadata: notif.metadata,
    }));

    return apiCollection(
      notificationItems,
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
