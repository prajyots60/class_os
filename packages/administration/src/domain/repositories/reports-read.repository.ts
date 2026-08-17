import type { AttendanceReportResponseDTO, FeeCollectionReportResponseDTO } from '../../application/dto/reports.dto';

export interface AttendanceReportFilters {
  instituteId: string;
  fromIso: string;
  toIso: string;
  batchId?: string;
  subjectId?: string;
  teacherId?: string;
  teacherIdScope?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FeeReportFilters {
  instituteId: string;
  fromIso: string;
  toIso: string;
  paymentMode?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReportsReadRepository {
  getAttendanceReport(filters: AttendanceReportFilters): Promise<AttendanceReportResponseDTO>;
  getFeeCollectionReport(filters: FeeReportFilters): Promise<FeeCollectionReportResponseDTO>;
}
