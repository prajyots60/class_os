import { generateRequestId } from '@coaching-os/observability';
import { type NextRequest } from 'next/server';
import { db } from '@coaching-os/database';
import { NotFoundError } from '@coaching-os/shared';
import {
  withParentAuthGuard,
  apiSuccess,
  methodNotAllowed,
} from '../../../../_lib/v1-guard';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();
  const { id: notificationId } = await params;

  return withParentAuthGuard(req, requestId, async (parentCtx) => {
    const notification = await db.notification.findFirst({
      where: {
        id: notificationId,
        recipientUserId: parentCtx.userId,
      },
    });

    if (!notification) {
      throw new NotFoundError(
        `Notification "${notificationId}" not found or unauthorized.`,
      );
    }

    const updatedReadAt = notification.readAt ?? new Date();

    const updated = await db.notification.update({
      where: { id: notification.id },
      data: {
        isRead: true,
        readAt: updatedReadAt,
      },
    });

    return apiSuccess(
      {
        id: updated.id,
        isRead: updated.isRead,
        readAt: updated.readAt ? updated.readAt.toISOString() : null,
      },
      requestId,
    );
  });
}

export async function GET() {
  return methodNotAllowed(['POST']);
}

export async function PATCH() {
  return methodNotAllowed(['POST']);
}

export async function DELETE() {
  return methodNotAllowed(['POST']);
}
