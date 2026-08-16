import type {
  ParentHubDTO,
  ParentStudentAttendanceDTO,
  ParentStudentHomeworkDTO,
  ParentStudentAssessmentDTO,
  ParentStudentBillingDTO,
  ParentReceiptDetailDTO,
  ParentTimelineEventDTO,
  ParentNotificationDTO,
  ParentUnreadCountDTO,
} from '../types/parent-ui.types';

export class ParentApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ParentApiError';
  }
}

export class ParentApiClient {
  private static async request<T>(url: string, options: RequestInit = {}): Promise<T> {
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
      throw new ParentApiError(errorMsg, res.status, body?.error?.details || body);
    }

    return body.data as T;
  }

  static async getParentHub(): Promise<ParentHubDTO> {
    return this.request<ParentHubDTO>('/api/v1/parent/hub', {
      method: 'GET',
    });
  }

  static async getStudentAttendance(studentId: string): Promise<ParentStudentAttendanceDTO> {
    return this.request<ParentStudentAttendanceDTO>(
      `/api/v1/parent/students/${encodeURIComponent(studentId)}/attendance`,
      { method: 'GET' },
    );
  }

  static async getStudentHomework(studentId: string): Promise<ParentStudentHomeworkDTO> {
    return this.request<ParentStudentHomeworkDTO>(
      `/api/v1/parent/students/${encodeURIComponent(studentId)}/homework`,
      { method: 'GET' },
    );
  }

  static async getStudentAssessments(studentId: string): Promise<ParentStudentAssessmentDTO> {
    return this.request<ParentStudentAssessmentDTO>(
      `/api/v1/parent/students/${encodeURIComponent(studentId)}/assessments`,
      { method: 'GET' },
    );
  }

  static async getStudentBilling(studentId: string): Promise<ParentStudentBillingDTO> {
    return this.request<ParentStudentBillingDTO>(
      `/api/v1/parent/students/${encodeURIComponent(studentId)}/billing`,
      { method: 'GET' },
    );
  }

  static async getStudentReceipt(
    studentId: string,
    receiptId: string,
  ): Promise<ParentReceiptDetailDTO> {
    return this.request<ParentReceiptDetailDTO>(
      `/api/v1/parent/students/${encodeURIComponent(studentId)}/receipts/${encodeURIComponent(receiptId)}`,
      { method: 'GET' },
    );
  }

  static async getTimeline(options?: {
    studentId?: string | null;
    cursor?: string | null;
    limit?: number;
  }): Promise<{ items: ParentTimelineEventDTO[]; nextCursor: string | null; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (options?.studentId) params.set('studentId', options.studentId);
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.limit) params.set('limit', String(options.limit));

    const url = `/api/v1/parent/timeline${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await this.request<ParentTimelineEventDTO[]>(url, { method: 'GET' });
    // Handle paginated response wrapper if present
    const responseWithPagination = res as unknown as {
      data: ParentTimelineEventDTO[];
      pagination?: { nextCursor: string | null; hasMore: boolean };
    };

    return {
      items: Array.isArray(res) ? res : responseWithPagination.data || [],
      nextCursor: responseWithPagination.pagination?.nextCursor ?? null,
      hasMore: responseWithPagination.pagination?.hasMore ?? false,
    };
  }

  static async getNotifications(options?: {
    isRead?: boolean;
    cursor?: string | null;
    limit?: number;
  }): Promise<{ items: ParentNotificationDTO[]; nextCursor: string | null; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (options?.isRead !== undefined) params.set('isRead', String(options.isRead));
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.limit) params.set('limit', String(options.limit));

    const url = `/api/v1/parent/notifications${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await this.request<ParentNotificationDTO[]>(url, { method: 'GET' });
    const responseWithPagination = res as unknown as {
      data: ParentNotificationDTO[];
      pagination?: { nextCursor: string | null; hasMore: boolean };
    };

    return {
      items: Array.isArray(res) ? res : responseWithPagination.data || [],
      nextCursor: responseWithPagination.pagination?.nextCursor ?? null,
      hasMore: responseWithPagination.pagination?.hasMore ?? false,
    };
  }

  static async getUnreadNotificationCount(): Promise<ParentUnreadCountDTO> {
    return this.request<ParentUnreadCountDTO>(
      `/api/v1/parent/notifications/unread-count`,
      { method: 'GET' },
    );
  }

  static async markNotificationAsRead(
    notificationId: string,
  ): Promise<{ id: string; isRead: boolean; readAt: string | null }> {
    return this.request<{ id: string; isRead: boolean; readAt: string | null }>(
      `/api/v1/parent/notifications/${encodeURIComponent(notificationId)}/read`,
      { method: 'POST' },
    );
  }
}
