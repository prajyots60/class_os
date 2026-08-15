/**
 * communication-ui.types.ts
 *
 * Presentation DTOs and Form Input Contracts for Communication Workspace.
 * Follows Phase 4.6 API Contract and Phase 4.7 UI Contract.
 */

export type AnnouncementStatus = 'draft' | 'published' | 'archived';
export type AnnouncementTargetType = 'institute' | 'batch';

export interface AnnouncementDTO {
  id: string;
  instituteId: string;
  authorUserId: string;
  targetType: AnnouncementTargetType;
  targetBatchId: string | null;
  title: string;
  body: string;
  status: AnnouncementStatus;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementInput {
  targetType: AnnouncementTargetType;
  targetBatchId?: string | null;
  title: string;
  body: string;
}

export interface UpdateAnnouncementInput {
  targetType?: AnnouncementTargetType;
  targetBatchId?: string | null;
  title?: string;
  body?: string;
}

export type NotificationPriority = 'critical' | 'important' | 'informational';

export interface NotificationDTO {
  id: string;
  instituteId: string;
  recipientUserId: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  category: string;
  isRead: boolean;
  readAt: string | null;
  actionUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationUnreadCountDTO {
  unreadCount: number;
}

export type ActivityEventType =
  | 'attendance_absent'
  | 'attendance_present'
  | 'homework_assigned'
  | 'test_result'
  | 'fee_payment'
  | 'receipt_issued'
  | 'announcement';

export interface ActivityDTO {
  id: string;
  instituteId: string;
  studentId: string;
  eventType: ActivityEventType;
  title: string;
  description: string;
  occurredAt: string;
  actorName: string | null;
  metadata: Record<string, unknown> | null;
  idempotencyKey: string | null;
  createdAt: string;
}

export interface ListActivitiesResponse {
  items: ActivityDTO[];
  nextCursor: string | null;
}
