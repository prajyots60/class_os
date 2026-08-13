import { describe, it, expect, vi, beforeEach } from 'vitest';
import { v1AcademicsClient } from './api/v1-academics-client';

describe('v1AcademicsClient API Client Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('listSchedules fetches GET /api/v1/academics/schedules?batchId=...', async () => {
    const mockSchedules = [{ id: 'sched-1', batchId: 'batch-1', dayOfWeek: 'monday', startTime: '17:00', endTime: '18:30' }];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockSchedules }),
    } as Response);

    const result = await v1AcademicsClient.listSchedules('batch-1');
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockSchedules);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/academics/schedules?batchId=batch-1');
  });

  it('generateSessions dispatches POST /api/v1/academics/sessions/generate', async () => {
    const mockSessions = [{ id: 'sess-1', batchId: 'batch-1', sessionDate: '2026-08-17', status: 'scheduled' }];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockSessions }),
    } as Response);

    const payload = { batchId: 'batch-1', startDate: '2026-08-17', endDate: '2026-08-17' };
    const result = await v1AcademicsClient.generateSessions(payload);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockSessions);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/academics/sessions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('recordAttendance dispatches POST /api/v1/academics/attendance', async () => {
    const mockRecords = [{ id: 'att-1', sessionId: 'sess-1', enrollmentId: 'enr-1', status: 'present' }];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockRecords }),
    } as Response);

    const payload = {
      sessionId: 'sess-1',
      records: [{ enrollmentId: 'enr-1', status: 'present' as const }],
    };
    const result = await v1AcademicsClient.recordAttendance(payload);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockRecords);
  });

  it('publishHomework dispatches POST /api/v1/academics/homework/[id]/publish', async () => {
    const mockHw = { id: 'hw-1', isPublished: true };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockHw }),
    } as Response);

    const result = await v1AcademicsClient.publishHomework('hw-1');
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockHw);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/academics/homework/hw-1/publish', {
      method: 'POST',
    });
  });

  it('enterMarks dispatches POST /api/v1/academics/tests/[id]/marks', async () => {
    const mockMarks = [{ id: 'm-1', testId: 'test-1', enrollmentId: 'enr-1', marksObtained: 85 }];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockMarks }),
    } as Response);

    const payload = { records: [{ enrollmentId: 'enr-1', marksObtained: 85 }] };
    const result = await v1AcademicsClient.enterMarks('test-1', payload);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockMarks);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/academics/tests/test-1/marks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });
});
