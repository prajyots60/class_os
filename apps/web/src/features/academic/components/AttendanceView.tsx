import * as React from 'react';
import { Button, Card, Badge, Spinner, Alert } from '@coaching-os/ui';
import { v1AcademicsClient } from '../api/v1-academics-client';
import { fetchBatchesList } from '../api/academic-api';
import type { V1BatchSessionDTO, AttendanceStatus } from '../types/v1-academics-ui.types';
import type { BatchDTO } from '@coaching-os/identity/client';

interface StudentEnrollmentItem {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
}

interface AttendanceViewProps {
  initialSessionId?: string;
  initialBatchId?: string;
  hasMutationCapability: boolean;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  initialSessionId,
  initialBatchId,
  hasMutationCapability,
}) => {
  const [batches, setBatches] = React.useState<BatchDTO[]>([]);
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>(initialBatchId || '');
  const [sessions, setSessions] = React.useState<V1BatchSessionDTO[]>([]);
  const [selectedSessionId, setSelectedSessionId] = React.useState<string>(initialSessionId || '');

  const [loading, setLoading] = React.useState<boolean>(true);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const [enrollments, setEnrollments] = React.useState<StudentEnrollmentItem[]>([]);
  const [attendanceMap, setAttendanceMap] = React.useState<Record<string, AttendanceStatus>>({});

  // 1. Fetch batches
  React.useEffect(() => {
    let mounted = true;
    async function loadBatches() {
      const res = await fetchBatchesList({ status: 'running' });
      if (!mounted) return;
      if (res.success && res.data) {
        setBatches(res.data);
        if (!selectedBatchId && res.data.length > 0) {
          setSelectedBatchId(res.data[0].id);
        }
      }
    }
    loadBatches();
    return () => {
      mounted = false;
    };
  }, [selectedBatchId]);

  // 2. Fetch sessions for batch
  React.useEffect(() => {
    if (!selectedBatchId) return;
    let mounted = true;
    async function loadSessions() {
      const res = await v1AcademicsClient.listSessions({ batchId: selectedBatchId });
      if (!mounted) return;
      if (res.success && res.data) {
        setSessions(res.data);
        if (!selectedSessionId && res.data.length > 0) {
          setSelectedSessionId(res.data[0].id);
        }
      }
    }
    loadSessions();
    return () => {
      mounted = false;
    };
  }, [selectedBatchId, selectedSessionId]);

  // 3. Load Roster & Existing Attendance for Session
  React.useEffect(() => {
    let mounted = true;
    async function loadRosterAndAttendance() {
      if (!selectedSessionId || !selectedBatchId) {
        if (mounted) setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      try {
        const enrollRes = await fetch(`/api/v1/enrollments?batchId=${selectedBatchId}`);
        const enrollData = await enrollRes.json();

        const items: StudentEnrollmentItem[] = [];
        if (mounted && enrollRes.ok && enrollData.data) {
          for (const item of enrollData.data) {
            if (item.status === 'active' && item.student) {
              items.push({
                enrollmentId: item.id,
                studentId: item.student.id,
                studentName: `${item.student.firstName} ${item.student.lastName}`,
                admissionNumber: item.student.admissionNumber,
              });
            }
          }
        }

        const attRes = await v1AcademicsClient.getAttendance(selectedSessionId);
        const initialAttMap: Record<string, AttendanceStatus> = {};

        if (mounted && attRes.success && attRes.data) {
          for (const record of attRes.data) {
            initialAttMap[record.enrollmentId] = record.status;
          }
        }

        for (const item of items) {
          if (!initialAttMap[item.enrollmentId]) {
            initialAttMap[item.enrollmentId] = 'present';
          }
        }

        if (mounted) {
          setEnrollments(items);
          setAttendanceMap(initialAttMap);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load enrollment roster or attendance.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadRosterAndAttendance();
    return () => {
      mounted = false;
    };
  }, [selectedSessionId, selectedBatchId]);

  const selectedSession = React.useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId);
  }, [sessions, selectedSessionId]);

  const handleStatusChange = (enrollmentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({ ...prev, [enrollmentId]: status }));
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    for (const item of enrollments) {
      updated[item.enrollmentId] = 'present';
    }
    setAttendanceMap(updated);
  };

  const handleSubmit = async () => {
    if (!selectedSessionId) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const records = enrollments.map((item) => ({
      enrollmentId: item.enrollmentId,
      status: attendanceMap[item.enrollmentId] || 'present',
    }));

    const res = await v1AcademicsClient.recordAttendance({
      sessionId: selectedSessionId,
      records,
    });

    setSubmitting(false);
    if (!res.success) {
      setError(res.error?.message || 'Failed to submit attendance.');
    } else {
      setSuccessMsg(`Attendance successfully recorded for ${records.length} student(s).`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Selector Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="att-batch-select" className="mr-2 text-xs font-semibold text-muted-foreground uppercase">
              Batch:
            </label>
            <select
              id="att-batch-select"
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setSelectedSessionId('');
              }}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="att-session-select" className="mr-2 text-xs font-semibold text-muted-foreground uppercase">
              Session:
            </label>
            <select
              id="att-session-select"
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sessionDate} ({s.startTime} - {s.endTime}) [{s.status.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedSession && (
          <div className="flex items-center gap-2">
            <Badge
              variant={
                selectedSession.status === 'cancelled'
                  ? 'destructive'
                  : selectedSession.status === 'completed'
                  ? 'success'
                  : 'default'
              }
            >
              Session {selectedSession.status.toUpperCase()}
            </Badge>
          </div>
        )}
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}
      {successMsg && <Alert variant="info">{successMsg}</Alert>}

      {selectedSession?.status === 'cancelled' && (
        <Alert variant="warning">
          <strong>Session Cancelled:</strong> Attendance cannot be marked or modified for cancelled sessions (ACADEMIC-009).
        </Alert>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : enrollments.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No active student enrollments found for this batch.
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-muted-foreground">
              Total Enrolled Students: <span className="font-bold text-foreground">{enrollments.length}</span>
            </p>
            {hasMutationCapability && selectedSession?.status !== 'cancelled' && (
              <Button variant="outline" size="sm" onClick={handleMarkAllPresent}>
                Mark All Present
              </Button>
            )}
          </div>

          {/* Student Attendance List */}
          <div className="space-y-2">
            {enrollments.map((student) => {
              const currentStatus = attendanceMap[student.enrollmentId] || 'present';
              const disabled = !hasMutationCapability || selectedSession?.status === 'cancelled';

              return (
                <Card key={student.enrollmentId} className="p-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-foreground text-sm">{student.studentName}</p>
                    <p className="text-xs text-muted-foreground">Adm #: {student.admissionNumber}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleStatusChange(student.enrollmentId, 'present')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-l-md border transition-colors ${
                        currentStatus === 'present'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-background text-muted-foreground border-input hover:bg-accent'
                      }`}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleStatusChange(student.enrollmentId, 'absent')}
                      className={`px-3 py-1.5 text-xs font-semibold border-t border-b transition-colors ${
                        currentStatus === 'absent'
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-background text-muted-foreground border-input hover:bg-accent'
                      }`}
                    >
                      Absent
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleStatusChange(student.enrollmentId, 'late')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-r-md border transition-colors ${
                        currentStatus === 'late'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-background text-muted-foreground border-input hover:bg-accent'
                      }`}
                    >
                      Late
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>

          {hasMutationCapability && selectedSession?.status !== 'cancelled' && (
            <div className="pt-4 flex justify-end">
              <Button variant="default" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Session Attendance'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
