/**
 * v1-communication-client.ts
 *
 * Client HTTP API Wrapper for Protected Communication APIs (/api/v1)
 * Consumes /api/v1/communication/announcements, /api/v1/communication/notifications,
 * and /api/v1/students/{studentId}/activities.
 * Direct Prisma imports or backend bypasses are strictly forbidden.
 */

import type {
  ActivityDTO,
  AnnouncementDTO,
  AnnouncementStatus,
  CreateAnnouncementInput,
  ListActivitiesResponse,
  NotificationDTO,
  NotificationUnreadCountDTO,
  UpdateAnnouncementInput,
} from '../types/communication-ui.types';

export class CommunicationApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'CommunicationApiError';
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'same-origin',
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg =
      body?.error?.message || body?.message || `HTTP Request failed with status ${res.status}`;
    throw new CommunicationApiError(errorMsg, res.status, body?.error?.details || body);
  }

  return body.data as T;
}

export const v1CommunicationClient = {
  // ─── Announcements ───────────────────────────────────────────────────────

  async listAnnouncements(params?: {
    status?: AnnouncementStatus;
    targetBatchId?: string;
    limit?: number;
    cursor?: string;
  }): Promise<AnnouncementDTO[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.targetBatchId) query.set('targetBatchId', params.targetBatchId);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.cursor) query.set('cursor', params.cursor);

    const qs = query.toString();
    const url = `/api/v1/communication/announcements${qs ? `?${qs}` : ''}`;
    return request<AnnouncementDTO[]>(url, { method: 'GET' });
  },

  async getAnnouncement(id: string): Promise<AnnouncementDTO> {
    return request<AnnouncementDTO>(`/api/v1/communication/announcements/${id}`, { method: 'GET' });
  },

  async createAnnouncement(input: CreateAnnouncementInput): Promise<AnnouncementDTO> {
    return request<AnnouncementDTO>('/api/v1/communication/announcements', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateAnnouncement(id: string, input: UpdateAnnouncementInput): Promise<AnnouncementDTO> {
    return request<AnnouncementDTO>(`/api/v1/communication/announcements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async deleteAnnouncement(id: string): Promise<{ id: string }> {
    return request<{ id: string }>(`/api/v1/communication/announcements/${id}`, {
      method: 'DELETE',
    });
  },

  async publishAnnouncement(id: string): Promise<AnnouncementDTO> {
    return request<AnnouncementDTO>(`/api/v1/communication/announcements/${id}/publish`, {
      method: 'POST',
    });
  },

  async archiveAnnouncement(id: string): Promise<AnnouncementDTO> {
    return request<AnnouncementDTO>(`/api/v1/communication/announcements/${id}/archive`, {
      method: 'POST',
    });
  },

  // ─── Notifications ────────────────────────────────────────────────────────

  async listNotifications(params?: {
    isRead?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<NotificationDTO[]> {
    const query = new URLSearchParams();
    if (params?.isRead !== undefined) query.set('isRead', String(params.isRead));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.cursor) query.set('cursor', params.cursor);

    const qs = query.toString();
    const url = `/api/v1/communication/notifications${qs ? `?${qs}` : ''}`;
    return request<NotificationDTO[]>(url, { method: 'GET' });
  },

  async getUnreadNotificationCount(): Promise<NotificationUnreadCountDTO> {
    return request<NotificationUnreadCountDTO>('/api/v1/communication/notifications/unread-count', {
      method: 'GET',
    });
  },

  async getNotification(id: string): Promise<NotificationDTO> {
    return request<NotificationDTO>(`/api/v1/communication/notifications/${id}`, {
      method: 'GET',
    });
  },

  async markNotificationAsRead(id: string): Promise<NotificationDTO> {
    return request<NotificationDTO>(`/api/v1/communication/notifications/${id}/read`, {
      method: 'POST',
    });
  },

  // ─── Student Activities ───────────────────────────────────────────────────

  async listStudentActivities(
    studentId: string,
    params?: { eventType?: string; limit?: number; cursor?: string },
  ): Promise<ListActivitiesResponse> {
    const query = new URLSearchParams();
    if (params?.eventType) query.set('eventType', params.eventType);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.cursor) query.set('cursor', params.cursor);

    const qs = query.toString();
    const url = `/api/v1/students/${studentId}/activities${qs ? `?${qs}` : ''}`;
    return request<ListActivitiesResponse>(url, { method: 'GET' });
  },

  async getStudentActivity(studentId: string, activityId: string): Promise<ActivityDTO> {
    return request<ActivityDTO>(`/api/v1/students/${studentId}/activities/${activityId}`, {
      method: 'GET',
    });
  },
};
