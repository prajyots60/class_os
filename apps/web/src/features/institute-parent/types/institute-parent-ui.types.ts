/**
 * institute-parent-ui.types.ts
 *
 * Presentation & UI DTO types for InstituteParent Staff CRM.
 */

export interface ParentIdentityDTO {
  id: string;
  phone: string;
  name: string | null;
  avatarUrl: string | null;
  status: 'active' | 'suspended' | 'deactivated';
  createdAt: string;
  updatedAt: string;
}

export interface InstituteParentDTO {
  id: string;
  instituteId: string;
  parentIdentityId: string;
  status: 'active' | 'inactive';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  parentIdentity?: ParentIdentityDTO;
}

export interface ApiParentsListResponse {
  success: boolean;
  data: InstituteParentDTO[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface ApiParentResponse {
  success: boolean;
  data: InstituteParentDTO | null;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface ApiActionResponse {
  success: boolean;
  data?: InstituteParentDTO;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface ParentFilterState {
  search: string;
  status: 'all' | 'active' | 'inactive';
  page: number;
  limit: number;
}

export interface CreateParentFormValues {
  phone: string;
  name?: string;
  notes?: string;
  initialStatus?: 'active' | 'inactive';
}

export interface EditParentFormValues {
  notes?: string;
  status?: 'active' | 'inactive';
}
