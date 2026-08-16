import type {
  ParentHubDTO,
  ParentHubIdentityDTO,
  ParentHubProfileSummaryDTO,
  ParentHubStudentSummaryDTO,
  ParentHubInstituteSummaryDTO,
  ParentHubMetaDTO,
} from '@coaching-os/identity';

export type {
  ParentHubDTO,
  ParentHubIdentityDTO,
  ParentHubProfileSummaryDTO,
  ParentHubStudentSummaryDTO,
  ParentHubInstituteSummaryDTO,
  ParentHubMetaDTO,
};

export interface ParentDashboardState {
  selectedProfileId: string | null;
}

export interface ParentApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}
