/**
 * enrollment-api.ts
 *
 * Typed API Client for Staff Enrollment Workspace.
 *
 * ARCHITECTURAL RULES:
 * - Encapsulates all fetch calls to `/api/institute/enrollments`.
 * - Normalizes HTTP errors into safe, user-friendly error responses.
 * - Does not leak raw backend/stack details to the client UI.
 */

import type {
  ApiEnrollmentsListResponse,
  ApiEnrollmentResponse,
  ApiTransferResponse,
  ApiActionResponse,
  CreateEnrollmentFormValues,
  TransferEnrollmentFormValues,
  StudentSummary,
  BatchSummary,
} from '../types/enrollment-ui.types';

export async function fetchEnrollmentsList(params?: {
  studentId?: string;
  batchId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiEnrollmentsListResponse> {
  const query = new URLSearchParams();
  if (params?.studentId) query.set('studentId', params.studentId);
  if (params?.batchId) query.set('batchId', params.batchId);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const url = `/api/institute/enrollments${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      data: [],
      error: {
        code: data?.error?.code || 'FETCH_ERROR',
        message: data?.error?.message || 'Failed to fetch enrollment records.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function fetchEnrollmentById(id: string): Promise<ApiEnrollmentResponse> {
  const response = await fetch(`/api/institute/enrollments/${id}`, {
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
        message: data?.error?.message || 'Failed to fetch enrollment details.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function createEnrollment(
  payload: CreateEnrollmentFormValues,
): Promise<ApiActionResponse> {
  const response = await fetch('/api/institute/enrollments', {
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
        message: data?.error?.message || 'Failed to create enrollment record.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function activateEnrollment(id: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/enrollments/${id}/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'ACTIVATE_ERROR',
        message: data?.error?.message || 'Failed to activate enrollment.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function completeEnrollment(id: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/enrollments/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'COMPLETE_ERROR',
        message: data?.error?.message || 'Failed to complete enrollment.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function withdrawEnrollment(id: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/enrollments/${id}/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'WITHDRAW_ERROR',
        message: data?.error?.message || 'Failed to withdraw enrollment.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function cancelEnrollment(id: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/enrollments/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'CANCEL_ERROR',
        message: data?.error?.message || 'Failed to cancel enrollment.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function transferEnrollment(
  id: string,
  payload: TransferEnrollmentFormValues,
): Promise<ApiTransferResponse> {
  const response = await fetch(`/api/institute/enrollments/${id}/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      data: null,
      error: {
        code: data?.error?.code || 'TRANSFER_ERROR',
        message: data?.error?.message || 'Failed to transfer enrollment.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function archiveEnrollment(id: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/enrollments/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'ARCHIVE_ERROR',
        message: data?.error?.message || 'Failed to archive enrollment.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function fetchEligibleStudents(): Promise<StudentSummary[]> {
  try {
    const res = await fetch('/api/institute/students?admissionStatus=admitted', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map((s: Record<string, unknown>) => ({
      id: String(s.id),
      displayName: String(s.displayName || `${s.firstName || ''} ${s.lastName || ''}`.trim()),
      admissionNumber: String(s.admissionNumber || ''),
      email: (s.email as string) || null,
      phone: (s.phone as string) || null,
      admissionStatus: String(s.admissionStatus || ''),
      status: String(s.status || ''),
    }));
  } catch {
    return [];
  }
}

export async function fetchEligibleBatches(): Promise<BatchSummary[]> {
  try {
    const res = await fetch('/api/institute/batches', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map((b: Record<string, unknown>) => {
      const subj = b.subject as Record<string, unknown> | undefined;
      const prog = b.program as Record<string, unknown> | undefined;
      return {
        id: String(b.id),
        name: String(b.name || ''),
        code: String(b.code || ''),
        subjectId: String(b.subjectId || ''),
        subjectName: (subj?.name as string) || undefined,
        programId: (b.programId as string) || undefined,
        programName: (prog?.name as string) || undefined,
        capacity: Number(b.capacity || 0),
        status: String(b.status || ''),
      };
    });
  } catch {
    return [];
  }
}
