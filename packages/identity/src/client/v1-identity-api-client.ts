/**
 * Client-safe SDK Adapter for /api/v1 Protected Identity APIs
 * (ADR-0015 Compliant, pure TypeScript, zero server/Prisma imports)
 */

import type { StudentDTO } from '../application/dto/student.dto';
import type { InstituteParentDTO } from '../application/dto/institute-parent.dto';
import type { StaffMembershipDTO } from '../application/dto/membership.dto';
import type { EnrollmentDTO } from '../application/dto/enrollment.dto';
import type { StudentGuardianSummaryDTO, ParentStudentSummaryDTO } from '../application/dto/institute-parent-student.dto';
import {
  V1ApiError,
  type V1CollectionResponse,
  type V1ErrorResponse,
  type V1SuccessResponse,
} from '../application/dto/api-v1-response.dto';

export interface V1ClientOptions {
  baseUrl?: string;
  fetchFn?: typeof fetch;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
}

export interface StudentListQuery {
  search?: string;
  status?: string;
  admissionStatus?: string;
  limit?: number;
  cursor?: string;
}

export interface StudentUpdatePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  dob?: string;
  gender?: string;
}

export interface GuardianListQuery {
  search?: string;
  status?: string;
  limit?: number;
  cursor?: string;
}

export interface StaffListQuery {
  role?: string;
  status?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

export interface EnrollmentListQuery {
  studentId?: string;
  batchId?: string;
  status?: string;
  limit?: number;
  cursor?: string;
}

export class V1IdentityApiClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;
  private readonly credentials?: RequestCredentials;

  constructor(options: V1ClientOptions = {}) {
    this.baseUrl = options.baseUrl ? options.baseUrl.replace(/\/$/, '') : '';
    this.fetchFn = options.fetchFn || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : (fetch as typeof fetch));
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    this.credentials = options.credentials || 'same-origin';
  }

  private buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
    const url = `${this.baseUrl}${path}`;
    if (!params) return url;

    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  private async request<T>(
    endpoint: string,
    init: RequestInit = {},
  ): Promise<T> {
    const headers = {
      ...this.defaultHeaders,
      ...(init.headers as Record<string, string>),
    };

    const res = await this.fetchFn(endpoint, {
      ...init,
      headers,
      credentials: this.credentials,
    });

    const json = (await res.json()) as V1SuccessResponse<T> | V1CollectionResponse<T> | V1ErrorResponse;

    if (!res.ok || !json.success) {
      const errRes = json as V1ErrorResponse;
      const code = errRes.error?.code || 'HTTP_ERROR';
      const message = errRes.error?.message || `Request failed with status ${res.status}`;
      const details = errRes.error?.details;
      const requestId = errRes.meta?.requestId;
      throw new V1ApiError(message, res.status, code, details, requestId);
    }

    return (json as V1SuccessResponse<T>).data;
  }

  private async requestCollection<T>(
    endpoint: string,
    init: RequestInit = {},
  ): Promise<V1CollectionResponse<T>> {
    const headers = {
      ...this.defaultHeaders,
      ...(init.headers as Record<string, string>),
    };

    const res = await this.fetchFn(endpoint, {
      ...init,
      headers,
      credentials: this.credentials,
    });

    const json = (await res.json()) as V1CollectionResponse<T> | V1ErrorResponse;

    if (!res.ok || !json.success) {
      const errRes = json as V1ErrorResponse;
      const code = errRes.error?.code || 'HTTP_ERROR';
      const message = errRes.error?.message || `Request failed with status ${res.status}`;
      const details = errRes.error?.details;
      const requestId = errRes.meta?.requestId;
      throw new V1ApiError(message, res.status, code, details, requestId);
    }

    return json as V1CollectionResponse<T>;
  }

  // ── 1. Students API ────────────────────────────────────────────────────────

  public readonly students = {
    list: (query?: StudentListQuery): Promise<V1CollectionResponse<StudentDTO>> => {
      const url = this.buildUrl('/api/v1/students', query as Record<string, string | number | undefined>);
      return this.requestCollection<StudentDTO>(url, { method: 'GET' });
    },

    getById: (id: string): Promise<StudentDTO> => {
      const url = this.buildUrl(`/api/v1/students/${encodeURIComponent(id)}`);
      return this.request<StudentDTO>(url, { method: 'GET' });
    },

    update: (id: string, payload: StudentUpdatePayload): Promise<StudentDTO> => {
      const url = this.buildUrl(`/api/v1/students/${encodeURIComponent(id)}`);
      return this.request<StudentDTO>(url, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },

    getGuardians: (id: string): Promise<StudentGuardianSummaryDTO[]> => {
      const url = this.buildUrl(`/api/v1/students/${encodeURIComponent(id)}/guardians`);
      return this.request<StudentGuardianSummaryDTO[]>(url, { method: 'GET' });
    },
  };

  // ── 2. Guardians API ───────────────────────────────────────────────────────

  public readonly guardians = {
    list: (query?: GuardianListQuery): Promise<V1CollectionResponse<InstituteParentDTO>> => {
      const url = this.buildUrl('/api/v1/guardians', query as Record<string, string | number | undefined>);
      return this.requestCollection<InstituteParentDTO>(url, { method: 'GET' });
    },

    getById: (id: string): Promise<InstituteParentDTO> => {
      const url = this.buildUrl(`/api/v1/guardians/${encodeURIComponent(id)}`);
      return this.request<InstituteParentDTO>(url, { method: 'GET' });
    },

    getStudents: (id: string): Promise<ParentStudentSummaryDTO[]> => {
      const url = this.buildUrl(`/api/v1/guardians/${encodeURIComponent(id)}/students`);
      return this.request<ParentStudentSummaryDTO[]>(url, { method: 'GET' });
    },
  };

  // ── 3. Staff / Memberships API ─────────────────────────────────────────────

  public readonly staff = {
    list: (query?: StaffListQuery): Promise<V1CollectionResponse<StaffMembershipDTO>> => {
      const url = this.buildUrl('/api/v1/staff', query as Record<string, string | number | undefined>);
      return this.requestCollection<StaffMembershipDTO>(url, { method: 'GET' });
    },

    getById: (id: string): Promise<StaffMembershipDTO> => {
      const url = this.buildUrl(`/api/v1/staff/${encodeURIComponent(id)}`);
      return this.request<StaffMembershipDTO>(url, { method: 'GET' });
    },
  };

  // ── 4. Enrollments API ─────────────────────────────────────────────────────

  public readonly enrollments = {
    list: (query?: EnrollmentListQuery): Promise<V1CollectionResponse<EnrollmentDTO>> => {
      const url = this.buildUrl('/api/v1/enrollments', query as Record<string, string | number | undefined>);
      return this.requestCollection<EnrollmentDTO>(url, { method: 'GET' });
    },

    getById: (id: string): Promise<EnrollmentDTO> => {
      const url = this.buildUrl(`/api/v1/enrollments/${encodeURIComponent(id)}`);
      return this.request<EnrollmentDTO>(url, { method: 'GET' });
    },
  };
}
