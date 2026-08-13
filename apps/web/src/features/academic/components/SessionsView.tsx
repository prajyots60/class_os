import * as React from 'react';
import { Button, Card, Badge, Spinner, Alert, Input, Label } from '@coaching-os/ui';
import { v1AcademicsClient } from '../api/v1-academics-client';
import { fetchBatchesList } from '../api/academic-api';
import type { V1BatchSessionDTO, V1ScheduleDTO, DayOfWeek } from '../types/v1-academics-ui.types';
import type { BatchDTO } from '@coaching-os/identity/client';

interface SessionsViewProps {
  initialBatchId?: string;
  hasMutationCapability: boolean;
  onNavigateToAttendance: (sessionId: string, batchId: string) => void;
}

export const SessionsView: React.FC<SessionsViewProps> = ({
  initialBatchId,
  hasMutationCapability,
  onNavigateToAttendance,
}) => {
  const [batches, setBatches] = React.useState<BatchDTO[]>([]);
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>(initialBatchId || '');
  const [loading, setLoading] = React.useState<boolean>(true);
  const [actionLoading, setActionLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const [schedules, setSchedules] = React.useState<V1ScheduleDTO[]>([]);
  const [sessions, setSessions] = React.useState<V1BatchSessionDTO[]>([]);

  // Modal states
  const [showGenerateModal, setShowGenerateModal] = React.useState(false);
  const [showCreateScheduleModal, setShowCreateScheduleModal] = React.useState(false);

  // Form states with lazy initializer for purity
  const [generateForm, setGenerateForm] = React.useState(() => ({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  }));

  const [scheduleForm, setScheduleForm] = React.useState<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    room: string;
  }>({
    dayOfWeek: 'monday',
    startTime: '17:00',
    endTime: '18:30',
    room: '',
  });

  // Load batch list
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
      setLoading(false);
    }
    loadBatches();
    return () => {
      mounted = false;
    };
  }, [selectedBatchId]);

  // Load schedules and sessions when selectedBatchId changes
  const fetchBatchData = React.useCallback(async () => {
    if (!selectedBatchId) return;
    setLoading(true);
    setError(null);
    try {
      const [schedRes, sessRes] = await Promise.all([
        v1AcademicsClient.listSchedules(selectedBatchId),
        v1AcademicsClient.listSessions({ batchId: selectedBatchId }),
      ]);

      if (schedRes.success) setSchedules(schedRes.data || []);
      if (sessRes.success) setSessions(sessRes.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch batch sessions/schedules');
    } finally {
      setLoading(false);
    }
  }, [selectedBatchId]);

  React.useEffect(() => {
    let mounted = true;
    async function loadData() {
      if (!selectedBatchId) return;
      try {
        const [schedRes, sessRes] = await Promise.all([
          v1AcademicsClient.listSchedules(selectedBatchId),
          v1AcademicsClient.listSessions({ batchId: selectedBatchId }),
        ]);

        if (mounted) {
          if (schedRes.success) setSchedules(schedRes.data || []);
          if (sessRes.success) setSessions(sessRes.data || []);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch batch sessions/schedules');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [selectedBatchId]);

  // Handlers
  const handleGenerateSessions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await v1AcademicsClient.generateSessions({
      batchId: selectedBatchId,
      startDate: generateForm.startDate,
      endDate: generateForm.endDate,
    });

    setActionLoading(false);
    if (!res.success) {
      setError(res.error?.message || 'Failed to generate sessions.');
    } else {
      setSuccessMsg(`Successfully generated ${res.data?.length || 0} candidate session(s).`);
      setShowGenerateModal(false);
      fetchBatchData();
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) return;
    setActionLoading(true);
    setError(null);

    const res = await v1AcademicsClient.createSchedule({
      batchId: selectedBatchId,
      dayOfWeek: scheduleForm.dayOfWeek,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      room: scheduleForm.room || undefined,
    });

    setActionLoading(false);
    if (!res.success) {
      setError(res.error?.message || 'Failed to create schedule.');
    } else {
      setSuccessMsg('Schedule created successfully.');
      setShowCreateScheduleModal(false);
      fetchBatchData();
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    setActionLoading(true);
    const res = await v1AcademicsClient.deleteSchedule(id, selectedBatchId);
    setActionLoading(false);
    if (!res.success) {
      setError(res.error?.message || 'Failed to delete schedule.');
    } else {
      setSuccessMsg('Schedule deleted successfully.');
      fetchBatchData();
    }
  };

  const handleCompleteSession = async (id: string) => {
    setActionLoading(true);
    const res = await v1AcademicsClient.completeSession(id);
    setActionLoading(false);
    if (!res.success) {
      setError(res.error?.message || 'Failed to complete session.');
    } else {
      setSuccessMsg('Session marked as COMPLETED.');
      fetchBatchData();
    }
  };

  const handleCancelSession = async (id: string) => {
    if (!confirm('Are you sure you want to CANCEL this session? Attendance will be disabled for cancelled sessions.')) return;
    setActionLoading(true);
    const res = await v1AcademicsClient.cancelSession(id, 'Cancelled by teacher via workspace');
    setActionLoading(false);
    if (!res.success) {
      setError(res.error?.message || 'Failed to cancel session.');
    } else {
      setSuccessMsg('Session marked as CANCELLED.');
      fetchBatchData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar / Batch Selector */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Label htmlFor="batch-select" className="font-semibold text-foreground">
            Select Batch:
          </Label>
          <select
            id="batch-select"
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>

        {hasMutationCapability && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreateScheduleModal(true)}>
              + Add Schedule
            </Button>
            <Button variant="default" size="sm" onClick={() => setShowGenerateModal(true)}>
              ⚡ Generate Sessions
            </Button>
          </div>
        )}
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}
      {successMsg && <Alert variant="info">{successMsg}</Alert>}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Recurring Weekly Schedules Section */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-foreground">Recurring Weekly Schedules</h3>
            {schedules.length === 0 ? (
              <Card className="p-4 text-center text-sm text-muted-foreground">
                No recurring weekly schedules configured for this batch yet.
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {schedules.map((s) => (
                  <Card key={s.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-semibold capitalize text-foreground">{s.dayOfWeek}</p>
                      <p className="text-xs text-muted-foreground">{s.startTime} – {s.endTime}</p>
                      {s.room && <p className="text-xs text-muted-foreground">Room: {s.room}</p>}
                    </div>
                    {hasMutationCapability && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteSchedule(s.id)}
                        disabled={actionLoading}
                      >
                        Delete
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Concrete Batch Sessions Section */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-foreground">Concrete Batch Sessions</h3>
            {sessions.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                No sessions generated for this batch. Click <strong>&quot;Generate Sessions&quot;</strong> above to generate sessions from recurring schedules.
              </Card>
            ) : (
              <div className="space-y-3">
                {sessions.map((sess) => (
                  <Card key={sess.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{sess.sessionDate}</span>
                        <span className="text-sm font-medium text-muted-foreground">({sess.startTime} – {sess.endTime})</span>
                        <Badge
                          variant={
                            sess.status === 'completed'
                              ? 'success'
                              : sess.status === 'cancelled'
                              ? 'destructive'
                              : 'default'
                          }
                        >
                          {sess.status.toUpperCase()}
                        </Badge>
                      </div>
                      {sess.topic && <p className="text-xs text-muted-foreground mt-1">Topic: {sess.topic}</p>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={sess.status === 'cancelled'}
                        onClick={() => onNavigateToAttendance(sess.id, selectedBatchId)}
                      >
                        Take Attendance
                      </Button>

                      {hasMutationCapability && sess.status === 'scheduled' && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleCompleteSession(sess.id)}
                            disabled={actionLoading}
                          >
                            Complete
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelSession(sess.id)}
                            disabled={actionLoading}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generate Sessions Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-bold text-foreground">Generate Batch Sessions</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Generates candidate sessions from recurring schedules for the specified date range.
            </p>
            <form onSubmit={handleGenerateSessions} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={generateForm.startDate}
                  onChange={(e) => setGenerateForm({ ...generateForm, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={generateForm.endDate}
                  onChange={(e) => setGenerateForm({ ...generateForm, endDate: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowGenerateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="default" disabled={actionLoading}>
                  {actionLoading ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showCreateScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-bold text-foreground">Add Weekly Schedule</h3>
            <form onSubmit={handleCreateSchedule} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="dow">Day of Week</Label>
                <select
                  id="dow"
                  value={scheduleForm.dayOfWeek}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, dayOfWeek: e.target.value as DayOfWeek })}
                  className="w-full rounded-md border border-input bg-background p-2 text-sm text-foreground"
                >
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                  <option value="sunday">Sunday</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="start-time">Start Time (HH:mm)</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={scheduleForm.startTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end-time">End Time (HH:mm)</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={scheduleForm.endTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="room">Room (Optional)</Label>
                <Input
                  id="room"
                  placeholder="e.g. Room 101"
                  value={scheduleForm.room}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, room: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateScheduleModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="default" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save Schedule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
