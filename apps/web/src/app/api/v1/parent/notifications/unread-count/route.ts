import { generateRequestId } from '@coaching-os/observability';
import { type NextRequest } from 'next/server';
import { db } from '@coaching-os/database';
import {
  withParentAuthGuard,
  apiSuccess,
  methodNotAllowed,
} from '../../../_lib/v1-guard';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();

  return withParentAuthGuard(req, requestId, async (parentCtx) => {
    const unreadCount = await db.notification.count({
      where: {
        recipientUserId: parentCtx.userId,
        isRead: false,
      },
    });

    return apiSuccess({ unreadCount }, requestId);
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
