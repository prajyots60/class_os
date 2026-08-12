import type { ProgramDTO, SubjectDTO, ProgramSubjectDTO, BatchDTO } from '@coaching-os/identity/client';
import type {
  ApiAcademicListResponse,
  ApiActionResponse,
  StaffMemberDTO,
  CreateProgramFormValues,
  EditProgramFormValues,
  CreateSubjectFormValues,
  EditSubjectFormValues,
  CreateProgramSubjectFormValues,
  CreateBatchFormValues,
  EditBatchFormValues,
  AssignTeacherFormValues,
  ChangeBatchStatusFormValues,
} from '../types/academic-ui.types';

// ============================================================================
// Programs API
// ============================================================================

export async function fetchProgramsList(): Promise<ApiAcademicListResponse<ProgramDTO>> {
  const response = await fetch('/api/institute/programs', {
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
        message: data?.error?.message || 'Failed to fetch program records.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}

export async function createProgram(payload: CreateProgramFormValues): Promise<ApiActionResponse> {
  const response = await fetch('/api/institute/programs', {
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
        message: data?.error?.message || 'Failed to create program.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}

export async function updateProgram(id: string, payload: EditProgramFormValues): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/programs/${id}`, {
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
        message: data?.error?.message || 'Failed to update program.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}

export async function archiveProgram(id: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/programs/${id}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'ARCHIVE_ERROR',
        message: data?.error?.message || 'Failed to archive program.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}

// ============================================================================
// Subjects API
// ============================================================================

export async function fetchSubjectsList(): Promise<ApiAcademicListResponse<SubjectDTO>> {
  const response = await fetch('/api/institute/subjects', {
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
        message: data?.error?.message || 'Failed to fetch subject records.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}

export async function createSubject(payload: CreateSubjectFormValues): Promise<ApiActionResponse> {
  const response = await fetch('/api/institute/subjects', {
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
        message: data?.error?.message || 'Failed to create subject.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}

export async function updateSubject(id: string, payload: EditSubjectFormValues): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/subjects/${id}`, {
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
        message: data?.error?.message || 'Failed to update subject.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}

export async function archiveSubject(id: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/subjects/${id}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'ARCHIVE_ERROR',
        message: data?.error?.message || 'Failed to archive subject.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}

// ============================================================================
// ProgramSubjects API
// ============================================================================

export async function fetchProgramSubjectsList(params?: {
  programId?: string;
  subjectId?: string;
}): Promise<ApiAcademicListResponse<ProgramSubjectDTO>> {
  const query = new URLSearchParams();
  if (params?.programId) query.set('programId', params.programId);
  if (params?.subjectId) query.set('subjectId', params.subjectId);

  const url = `/api/institute/program-subjects${query.toString() ? `?${query.toString()}` : ''}`;
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
        message: data?.error?.message || 'Failed to fetch ProgramSubject mappings.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}

export async function createProgramSubject(payload: CreateProgramSubjectFormValues): Promise<ApiActionResponse> {
  const response = await fetch('/api/institute/program-subjects', {
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
        message: data?.error?.message || 'Failed to create ProgramSubject mapping.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}

export async function deleteProgramSubject(programId: string, subjectId: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/program-subjects/${programId}/${subjectId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'DELETE_ERROR',
        message: data?.error?.message || 'Failed to delete ProgramSubject mapping.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}

// ============================================================================
// Batches API
// ============================================================================

export async function fetchBatchesList(params?: {
  subjectId?: string;
  programId?: string;
  status?: string;
}): Promise<ApiAcademicListResponse<BatchDTO>> {
  const query = new URLSearchParams();
  if (params?.subjectId) query.set('subjectId', params.subjectId);
  if (params?.programId) query.set('programId', params.programId);
  if (params?.status && params.status !== 'all') query.set('status', params.status);

  const url = `/api/institute/batches${query.toString() ? `?${query.toString()}` : ''}`;
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
        message: data?.error?.message || 'Failed to fetch batch records.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}

export async function createBatch(payload: CreateBatchFormValues): Promise<ApiActionResponse> {
  const response = await fetch('/api/institute/batches', {
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
        message: data?.error?.message || 'Failed to create batch.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}

export async function updateBatch(id: string, payload: EditBatchFormValues): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/batches/${id}`, {
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
        message: data?.error?.message || 'Failed to update batch.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}

export async function assignBatchTeacher(id: string, payload: AssignTeacherFormValues): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/batches/${id}/teacher`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'ASSIGN_ERROR',
        message: data?.error?.message || 'Failed to assign teacher to batch.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}

export async function changeBatchStatus(id: string, payload: ChangeBatchStatusFormValues): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/batches/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'STATUS_ERROR',
        message: data?.error?.message || 'Failed to change batch status.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}

export async function archiveBatch(id: string): Promise<ApiActionResponse> {
  const response = await fetch(`/api/institute/batches/${id}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data?.error?.code || 'ARCHIVE_ERROR',
        message: data?.error?.message || 'Failed to archive batch.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}

// ============================================================================
// Staff API (for Teacher Selection)
// ============================================================================

export async function fetchStaffList(): Promise<ApiAcademicListResponse<StaffMemberDTO>> {
  const response = await fetch('/api/institute/staff', {
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
        message: data?.error?.message || 'Failed to fetch staff members.',
        details: data?.error?.details,
      },
    };
  }
  return data;
}
