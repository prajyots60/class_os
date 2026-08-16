export interface ParentHubIdentityDTO {
  id: string;
  phone: string;
  name: string | null;
  avatar: string | null;
  status: string;
}

export interface ParentHubEnrollmentSummaryDTO {
  id: string;
  batchId: string;
  batchName: string;
  status: string;
}

export interface ParentHubStudentSummaryDTO {
  linkId: string;
  studentId: string;
  instituteId: string;
  instituteName: string;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  status: string;
  enrollments: ParentHubEnrollmentSummaryDTO[];
}

export interface ParentHubProfileSummaryDTO {
  id: string;
  name: string;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
  linkedStudents: ParentHubStudentSummaryDTO[];
}

export interface ParentHubInstituteSummaryDTO {
  id: string;
  name: string;
  slug: string;
  studentCount: number;
}

export interface ParentHubMetaDTO {
  totalProfiles: number;
  totalLinks: number;
  totalInstitutes: number;
}

export interface ParentHubDTO {
  parent: ParentHubIdentityDTO;
  profiles: ParentHubProfileSummaryDTO[];
  institutes: ParentHubInstituteSummaryDTO[];
  meta: ParentHubMetaDTO;
}
