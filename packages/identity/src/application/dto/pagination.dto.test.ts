import { describe, expect, it } from 'vitest';
import type {
  PaginatedResult,
  StudentListFilter,
  GuardianListFilter,
  StaffListFilter,
  EnrollmentListFilter,
} from './pagination.dto';

describe('pagination.dto contracts', () => {
  it('instantiates valid PaginatedResult structures', () => {
    const result: PaginatedResult<{ id: string }> = {
      items: [{ id: '1' }, { id: '2' }],
      nextCursor: 'cursor_2',
      hasMore: true,
      pageSize: 2,
      total: 10,
    };

    expect(result.items.length).toBe(2);
    expect(result.nextCursor).toBe('cursor_2');
    expect(result.hasMore).toBe(true);
    expect(result.pageSize).toBe(2);
    expect(result.total).toBe(10);
  });

  it('supports typed filters for all protected identity resources', () => {
    const studentFilter: StudentListFilter = {
      status: 'active',
      admissionStatus: 'admitted',
      search: 'John',
      limit: 20,
    };

    const guardianFilter: GuardianListFilter = {
      status: 'active',
      search: '+919876543210',
    };

    const staffFilter: StaffListFilter = {
      role: 'teacher',
      status: 'active',
    };

    const enrollmentFilter: EnrollmentListFilter = {
      studentId: 'std_123',
      batchId: 'btc_456',
      status: 'active',
    };

    expect(studentFilter.status).toBe('active');
    expect(guardianFilter.search).toBe('+919876543210');
    expect(staffFilter.role).toBe('teacher');
    expect(enrollmentFilter.status).toBe('active');
  });
});
