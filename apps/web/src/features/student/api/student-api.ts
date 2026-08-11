/**
 * student-api.ts
 *
 * Feature-specific API client for Student Staff CRM.
 *
 * ARCHITECTURAL RULES:
 * - Encapsulates all fetch calls to `/api/institute/students`.
 * - Normalizes HTTP errors into safe, user-friendly error responses.
 * - Does not leak raw backend/stack details to the client UI.
 */

import type {
  ApiStudentsListResponse,
  ApiStudentResponse,
  ApiActionResponse,
  CreateStudentFormValues,
  EditStudentFormValues,
  AdmitStudentFormValues,
} from '../types/student-ui.types';

export async function fetchStudentsList(params?: {
  status?: string;
  admissionStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ApiStudentsListResponse> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'all') {
    query.set('status', params.status);
  }
  if (params?.admissionStatus && params.admissionStatus !== 'all') {
    query.set('admissionStatus', params.admissionStatus);
  }
  if (params?.search && params.search.trim()) {
    query.set('search', params.search.trim());
  }
  if (params?.page) {
    query.set('page', params.page.toString());
  }
  if (params?.limit) {
    query.set('limit', params.limit.toString());
  }

  const url = `/api/institute/students${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      error: {
        code: data?.error?.code || 'FETCH_ERROR',
        message: data?.error?.message || 'Failed to fetch student records.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function fetchStudentById(id: string): Promise<ApiStudentResponse> {
  const response = await fetch(`/api/institute/students/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      data: null,
      error: {
        code: data?.error?.code || 'FETCH_ERROR',
        message: data?.error?.message || 'Failed to fetch student details.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function createStudent(
  payload: CreateStudentFormValues,
): Promise<ApiActionResponse> {
  const response = await fetch('/api/institute/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'CREATE_ERROR',
        message: data?.error?.message || 'Failed to create student.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function updateStudent(
  id: string,
  payload: EditStudentFormValues,
): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/students/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'UPDATE_ERROR',
        message: data?.error?.message || 'Failed to update student profile.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function admitStudent(
  id: string,
  payload?: AdmitStudentFormValues,
): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/students/${id}/admit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'ADMIT_ERROR',
        message: data?.error?.message || 'Failed to admit student.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function rejectStudent(id: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/students/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'REJECT_ERROR',
        message: data?.error?.message || 'Failed to reject student admission.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function cancelStudentAdmission(id: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/students/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'CANCEL_ERROR',
        message: data?.error?.message || 'Failed to cancel student admission.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function activateStudent(id: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/students/${id}/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'ACTIVATE_ERROR',
        message: data?.error?.message || 'Failed to activate student standing.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function deactivateStudent(id: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/students/${id}/deactivate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'DEACTIVATE_ERROR',
        message: data?.error?.message || 'Failed to deactivate student standing.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function archiveStudent(id: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/students/${id}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'ARCHIVE_ERROR',
        message: data?.error?.message || 'Failed to archive student record.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}
