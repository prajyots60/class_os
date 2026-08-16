import type {
  ParentHubDTO,
  ParentStudentAttendanceDTO,
  ParentStudentHomeworkDTO,
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
}
