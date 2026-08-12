/**
 * staff-api.ts
 *
 * Feature-specific API client for Staff Workspace.
 * Consumes protected `/api/v1/staff` HTTP endpoints.
 */

import type {
  ApiStaffListResponse,
  ApiStaffResponse,
  ApiActionResponse,
  InviteStaffFormValues,
  StaffRole,
} from '../types/staff-ui.types';

export async function fetchStaffList(params?: {
  role?: string;
  status?: string;
  cursor?: string;
  limit?: number;
}): Promise<ApiStaffListResponse> {
  const query = new URLSearchParams();
  if (params?.role && params.role !== 'all') {
    query.set('role', params.role);
  }
  if (params?.status && params.status !== 'all') {
    query.set('status', params.status);
  }
  if (params?.cursor) {
    query.set('cursor', params.cursor);
  }
  if (params?.limit) {
    query.set('limit', params.limit.toString());
  }

  const url = `/api/v1/staff${query.toString() ? `?${query.toString()}` : ''}`;
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
        message: data?.error?.message || 'Failed to fetch staff list.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function fetchStaffById(id: string): Promise<ApiStaffResponse> {
  const response = await fetch(`/api/v1/staff/${id}`, {
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
        message: data?.error?.message || 'Failed to fetch staff details.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function inviteStaffMember(payload: InviteStaffFormValues): Promise<ApiActionResponse> {
  const response = await fetch('/api/v1/staff/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'INVITE_ERROR',
        message: data?.error?.message || 'Failed to invite staff member.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function updateStaffRole(id: string, role: StaffRole): Promise<ApiActionResponse> {
  const response = await fetch(`/api/v1/staff/${id}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'ROLE_UPDATE_ERROR',
        message: data?.error?.message || 'Failed to update staff member role.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function activateStaffMember(id: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/v1/staff/${id}/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'ACTIVATE_ERROR',
        message: data?.error?.message || 'Failed to activate staff member.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function suspendStaffMember(id: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/v1/staff/${id}/suspend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'SUSPEND_ERROR',
        message: data?.error?.message || 'Failed to suspend staff member.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}

export async function removeStaffMember(id: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/v1/staff/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'REMOVE_ERROR',
        message: data?.error?.message || 'Failed to remove staff membership.',
        details: data?.error?.details,
      },
    };
  }

  return data;
}
