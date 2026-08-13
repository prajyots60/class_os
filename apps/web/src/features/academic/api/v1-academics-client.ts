/**
 * Phase 2.6 — Protected Academics API Client
 *
 * Centralized, strongly-typed HTTP fetch wrapper for `/api/v1/academics/...` endpoints.
 * Server session cookies are attached automatically by the browser.
 * Zero client-supplied instituteId parameters.
 */
import type {
  V1ScheduleDTO,
  V1BatchSessionDTO,
  V1AttendanceRecordDTO,
  V1HomeworkDTO,
  V1TestDTO,
  V1MarksDTO,
  CreateScheduleFormPayload,
  GenerateSessionsFormPayload,
  RecordAttendanceFormPayload,
  CreateHomeworkFormPayload,
  UpdateHomeworkFormPayload,
  CreateTestFormPayload,
  EnterMarksFormPayload,
  ApiV1Response,
  ApiV1CollectionResponse,
} from '../types/v1-academics-ui.types';

async function handleResponse<T>(res: Response): Promise<ApiV1Response<T>> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      data: null as unknown as T,
      error: {
        code: json?.error?.code || `HTTP_${res.status}`,
        message: json?.error?.message || `Request failed with status ${res.status}`,
        details: json?.error?.details,
      },
    };
  }
  return json;
}

export const v1AcademicsClient = {
  // ── Schedules ──────────────────────────────────────────────────────────────

  async listSchedules(batchId: string): Promise<ApiV1CollectionResponse<V1ScheduleDTO>> {
    const res = await fetch(`/api/v1/academics/schedules?batchId=${encodeURIComponent(batchId)}`);
    return handleResponse(res) as Promise<ApiV1CollectionResponse<V1ScheduleDTO>>;
  },

  async createSchedule(payload: CreateScheduleFormPayload): Promise<ApiV1Response<V1ScheduleDTO>> {
    const res = await fetch('/api/v1/academics/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteSchedule(scheduleId: string, batchId: string): Promise<ApiV1Response<void>> {
    const res = await fetch(`/api/v1/academics/schedules/${scheduleId}?batchId=${encodeURIComponent(batchId)}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // ── Sessions ───────────────────────────────────────────────────────────────

  async listSessions(params: { batchId: string; startDate?: string; endDate?: string }): Promise<ApiV1CollectionResponse<V1BatchSessionDTO>> {
    const query = new URLSearchParams();
    query.set('batchId', params.batchId);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);

    const res = await fetch(`/api/v1/academics/sessions?${query.toString()}`);
    return handleResponse(res) as Promise<ApiV1CollectionResponse<V1BatchSessionDTO>>;
  },

  async generateSessions(payload: GenerateSessionsFormPayload): Promise<ApiV1CollectionResponse<V1BatchSessionDTO>> {
    const res = await fetch('/api/v1/academics/sessions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res) as Promise<ApiV1CollectionResponse<V1BatchSessionDTO>>;
  },

  async completeSession(sessionId: string): Promise<ApiV1Response<V1BatchSessionDTO>> {
    const res = await fetch(`/api/v1/academics/sessions/${sessionId}/complete`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  async cancelSession(sessionId: string, reason?: string): Promise<ApiV1Response<V1BatchSessionDTO>> {
    const res = await fetch(`/api/v1/academics/sessions/${sessionId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
  },

  // ── Attendance ─────────────────────────────────────────────────────────────

  async getAttendance(sessionId: string): Promise<ApiV1CollectionResponse<V1AttendanceRecordDTO>> {
    const res = await fetch(`/api/v1/academics/attendance?sessionId=${encodeURIComponent(sessionId)}`);
    return handleResponse(res) as Promise<ApiV1CollectionResponse<V1AttendanceRecordDTO>>;
  },

  async recordAttendance(payload: RecordAttendanceFormPayload): Promise<ApiV1CollectionResponse<V1AttendanceRecordDTO>> {
    const res = await fetch('/api/v1/academics/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res) as Promise<ApiV1CollectionResponse<V1AttendanceRecordDTO>>;
  },

  // ── Homework ───────────────────────────────────────────────────────────────

  async listHomework(batchId: string): Promise<ApiV1CollectionResponse<V1HomeworkDTO>> {
    const res = await fetch(`/api/v1/academics/homework?batchId=${encodeURIComponent(batchId)}`);
    return handleResponse(res) as Promise<ApiV1CollectionResponse<V1HomeworkDTO>>;
  },

  async createHomework(payload: CreateHomeworkFormPayload): Promise<ApiV1Response<V1HomeworkDTO>> {
    const res = await fetch('/api/v1/academics/homework', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getHomework(homeworkId: string): Promise<ApiV1Response<V1HomeworkDTO>> {
    const res = await fetch(`/api/v1/academics/homework/${homeworkId}`);
    return handleResponse(res);
  },

  async updateHomework(homeworkId: string, payload: UpdateHomeworkFormPayload): Promise<ApiV1Response<V1HomeworkDTO>> {
    const res = await fetch(`/api/v1/academics/homework/${homeworkId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async publishHomework(homeworkId: string): Promise<ApiV1Response<V1HomeworkDTO>> {
    const res = await fetch(`/api/v1/academics/homework/${homeworkId}/publish`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  async deleteHomework(homeworkId: string): Promise<ApiV1Response<void>> {
    const res = await fetch(`/api/v1/academics/homework/${homeworkId}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // ── Tests & Marks ──────────────────────────────────────────────────────────

  async listTests(batchId: string): Promise<ApiV1CollectionResponse<V1TestDTO>> {
    const res = await fetch(`/api/v1/academics/tests?batchId=${encodeURIComponent(batchId)}`);
    return handleResponse(res) as Promise<ApiV1CollectionResponse<V1TestDTO>>;
  },

  async createTest(payload: CreateTestFormPayload): Promise<ApiV1Response<V1TestDTO>> {
    const res = await fetch('/api/v1/academics/tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async scheduleTest(testId: string, scheduledDate: string): Promise<ApiV1Response<V1TestDTO>> {
    const res = await fetch(`/api/v1/academics/tests/${testId}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledDate }),
    });
    return handleResponse(res);
  },

  async getMarks(testId: string): Promise<ApiV1CollectionResponse<V1MarksDTO>> {
    const res = await fetch(`/api/v1/academics/tests/${testId}/marks`);
    return handleResponse(res) as Promise<ApiV1CollectionResponse<V1MarksDTO>>;
  },

  async enterMarks(testId: string, payload: EnterMarksFormPayload): Promise<ApiV1CollectionResponse<V1MarksDTO>> {
    const res = await fetch(`/api/v1/academics/tests/${testId}/marks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res) as Promise<ApiV1CollectionResponse<V1MarksDTO>>;
  },

  async publishTestResults(testId: string): Promise<ApiV1Response<V1TestDTO>> {
    const res = await fetch(`/api/v1/academics/tests/${testId}/publish`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  async deleteTest(testId: string): Promise<ApiV1Response<void>> {
    const res = await fetch(`/api/v1/academics/tests/${testId}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },
};
