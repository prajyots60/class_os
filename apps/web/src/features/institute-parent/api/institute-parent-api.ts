/**
 * institute-parent-api.ts
 *
 * Feature-specific API client for InstituteParent Staff CRM.
 *
 * ARCHITECTURAL RULES:
 * - Encapsulates all fetch calls to `/api/institute/parents`.
 * - Normalizes HTTP errors into safe, user-friendly error responses.
 * - Does not leak raw backend/stack details to the client UI.
 */

import type {
  ApiParentsListResponse,
  ApiParentResponse,
  ApiActionResponse,
  CreateParentFormValues,
  EditParentFormValues,
} from '../types/institute-parent-ui.types';

export async function fetchParentsList(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiParentsListResponse> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'all') {
    query.set('status', params.status);
  }
  if (params?.page) {
    query.set('page', params.page.toString());
  }
  if (params?.limit) {
    query.set('limit', params.limit.toString());
  }

  const url = `/api/institute/parents${query.toString() ? `?${query.toString()}` : ''}`;
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
        message: data?.error?.message || 'Failed to fetch parent records.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function fetchParentById(id: string): Promise<ApiParentResponse> {
  const response = await fetch(`/api/institute/parents/${id}`, {
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
        message: data?.error?.message || 'Failed to fetch parent details.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function createParent(
  payload: CreateParentFormValues,
): Promise<ApiActionResponse> {
  const response = await fetch('/api/institute/parents', {
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
        message: data?.error?.message || 'Failed to add parent.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function updateParent(
  id: string,
  payload: EditParentFormValues,
): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/parents/${id}`, {
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
        message: data?.error?.message || 'Failed to update parent.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function archiveParent(id: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/parents/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'ARCHIVE_ERROR',
        message: data?.error?.message || 'Failed to archive parent.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}
