/**
 * guardian-api.ts
 *
 * Typed API client for Guardian-Student Relationship management.
 * Wraps calls to `/api/institute/students/[studentId]/guardians`, `/api/institute/parents/[parentId]/students`,
 * and `/api/institute/parent-student/[id]`.
 */

import type {
  ApiGuardianListResponse,
  ApiGuardianResponse,
  ApiGuardianActionResponse,
  CreateGuardianFormValues,
  EditGuardianFormValues,
} from '../types/guardian-ui.types';

export async function listStudentGuardians(
  studentId: string,
): Promise<ApiGuardianListResponse> {
  const res = await fetch(`/api/institute/students/${studentId}/guardians`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      data: [],
      error: {
        code: data?.error?.code || 'FETCH_ERROR',
        message: data?.error?.message || 'Failed to fetch student guardians.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function listParentStudents(
  parentId: string,
): Promise<ApiGuardianListResponse> {
  const res = await fetch(`/api/institute/parents/${parentId}/students`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      data: [],
      error: {
        code: data?.error?.code || 'FETCH_ERROR',
        message: data?.error?.message || 'Failed to fetch parent students.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function getRelationship(
  id: string,
): Promise<ApiGuardianResponse> {
  const res = await fetch(`/api/institute/parent-student/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      data: null,
      error: {
        code: data?.error?.code || 'FETCH_ERROR',
        message: data?.error?.message || 'Failed to fetch relationship details.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function createRelationship(
  studentId: string,
  payload: CreateGuardianFormValues,
): Promise<ApiGuardianActionResponse> {
  const res = await fetch(`/api/institute/students/${studentId}/guardians`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      data: null,
      error: {
        code: data?.error?.code || 'CREATE_ERROR',
        message: data?.error?.message || 'Failed to link guardian.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function updateRelationship(
  id: string,
  payload: EditGuardianFormValues,
): Promise<ApiGuardianActionResponse> {
  const res = await fetch(`/api/institute/parent-student/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      data: null,
      error: {
        code: data?.error?.code || 'UPDATE_ERROR',
        message: data?.error?.message || 'Failed to update relationship.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function setPrimaryGuardian(
  id: string,
): Promise<ApiGuardianActionResponse> {
  const res = await fetch(`/api/institute/parent-student/${id}/primary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      data: null,
      error: {
        code: data?.error?.code || 'PRIMARY_ERROR',
        message: data?.error?.message || 'Failed to set primary guardian.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function archiveRelationship(
  id: string,
): Promise<ApiGuardianActionResponse> {
  const res = await fetch(`/api/institute/parent-student/${id}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      data: null,
      error: {
        code: data?.error?.code || 'ARCHIVE_ERROR',
        message: data?.error?.message || 'Failed to archive relationship.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}
