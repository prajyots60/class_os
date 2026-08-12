export type StaffRole = 'owner' | 'teacher' | 'assistant';
export type StaffStatus = 'active' | 'suspended' | 'removed';

export interface StaffUserSummaryDTO {
  name: string | null;
  email: string | null;
}

export interface StaffMembershipDTO {
  id: string;
  instituteId: string;
  userId: string;
  role: StaffRole;
  status: StaffStatus;
  user?: StaffUserSummaryDTO | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffFilterState {
  search: string;
  role: string; // 'all' | 'owner' | 'teacher' | 'assistant'
  status: string; // 'all' | 'active' | 'suspended' | 'removed'
  page: number;
  limit: number;
}

export interface ApiStaffListResponse {
  success: boolean;
  data: StaffMembershipDTO[];
  pagination?: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
    pageSize: number;
    total?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiStaffResponse {
  success: boolean;
  data: StaffMembershipDTO | null;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiActionResponse {
  success: boolean;
  data?: StaffMembershipDTO | null;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface InviteStaffFormValues {
  email?: string;
  userId?: string;
  role: StaffRole;
}

export interface UpdateStaffRoleFormValues {
  role: StaffRole;
}
