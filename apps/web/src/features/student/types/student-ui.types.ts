/**
 * student-ui.types.ts
 *
 * Strongly-typed definitions for the Student Staff CRM UI.
 */

export type StudentAdmissionStatus = 'pending' | 'admitted' | 'rejected' | 'cancelled';
export type StudentStatus = 'active' | 'inactive' | 'archived';
export type StudentGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface StudentDTO {
  id: string;
  instituteId: string;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  displayName: string;
  dateOfBirth: string | null;
  gender: StudentGender | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  admissionDate: string | null;
  admissionStatus: StudentAdmissionStatus;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateStudentFormValues {
  admissionNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: StudentGender;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export interface EditStudentFormValues {
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: StudentGender;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export interface AdmitStudentFormValues {
  admissionDate?: string;
}

export interface ApiStudentsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiStudentsListResponse {
  success: boolean;
  data: StudentDTO[];
  meta: ApiStudentsMeta;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiStudentResponse {
  success: boolean;
  data: StudentDTO | null;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiActionResponse {
  success: boolean;
  data?: StudentDTO;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
