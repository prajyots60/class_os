import type { AttendanceReportResponseDTO, FeeCollectionReportResponseDTO } from '@coaching-os/administration';

export async function fetchAttendanceReport(params: {
  from?: string;
  to?: string;
  batchId?: string;
  subjectId?: string;
  teacherId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<AttendanceReportResponseDTO> {
  const query = new URLSearchParams();
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.batchId) query.set('batchId', params.batchId);
  if (params.subjectId) query.set('subjectId', params.subjectId);
  if (params.teacherId) query.set('teacherId', params.teacherId);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  const res = await fetch(`/api/v1/reports/attendance?${query.toString()}`);
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || 'Failed to fetch attendance report.');
  }
  const json = await res.json();
  return json.data;
}

export async function fetchFeeCollectionReport(params: {
  from?: string;
  to?: string;
  paymentMode?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<FeeCollectionReportResponseDTO> {
  const query = new URLSearchParams();
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.paymentMode) query.set('paymentMode', params.paymentMode);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  const res = await fetch(`/api/v1/reports/fees?${query.toString()}`);
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || 'Failed to fetch fee collection report.');
  }
  const json = await res.json();
  return json.data;
}
