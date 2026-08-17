import { ValidationError } from '@coaching-os/shared';
import type { ReportsReadRepository, AttendanceReportFilters } from '../../domain/repositories/reports-read.repository';
import type { AttendanceReportResponseDTO } from '../dto/reports.dto';

export interface GetAttendanceReportInput {
  instituteId: string;
  from?: string;
  to?: string;
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

export class GetAttendanceReportUseCase {
  constructor(private readonly repo: ReportsReadRepository) {}

  public async execute(input: GetAttendanceReportInput): Promise<AttendanceReportResponseDTO> {
    const { instituteId } = input;
    if (!instituteId) {
      throw new ValidationError('Institute context is required.');
    }

    const now = new Date();
    const defaultTo = now.toISOString().split('T')[0];
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const fromIso = input.from || defaultFrom;
    const toIso = input.to || defaultTo;

    const fromDate = new Date(fromIso);
    const toDate = new Date(toIso);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new ValidationError('Invalid date format provided for report boundaries.');
    }

    if (fromDate > toDate) {
      throw new ValidationError('Start date (from) must be before or equal to end date (to).');
    }

    const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 3600 * 24);
    if (diffDays > 90) {
      throw new ValidationError('Date range cannot exceed 90 days.');
    }

    const filters: AttendanceReportFilters = {
      instituteId,
      fromIso,
      toIso,
      batchId: input.batchId,
      subjectId: input.subjectId,
      teacherId: input.teacherId,
      teacherIdScope: input.teacherIdScope,
      search: input.search,
      page: Math.max(1, input.page || 1),
      pageSize: Math.min(100, Math.max(1, input.pageSize || 25)),
      sortBy: input.sortBy || 'date',
      sortOrder: input.sortOrder || 'asc',
    };

    return this.repo.getAttendanceReport(filters);
  }
}
