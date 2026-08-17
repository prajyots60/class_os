import * as React from 'react';
import { Button, Card, Badge, Spinner, Alert, Label } from '@coaching-os/ui';
import { v1AcademicsClient } from '../api/v1-academics-client';
import { fetchBatchesList } from '../api/academic-api';
import type { V1BatchSessionDTO, V1ScheduleDTO, DayOfWeek } from '../types/v1-academics-ui.types';
import type { BatchDTO } from '@coaching-os/identity/client';
import { SessionOperationalTable } from './session-operational-table';

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
        if (!mounted) return;
        if (schedRes.success) setSchedules(schedRes.data || []);
        if (sessRes.success) setSessions(sessRes.data || []);
      } catch (err: unknown) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to fetch batch sessions/schedules');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [selectedBatchId]);

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
      setSuccessMsg(`Generated ${res.data?.length || 0} batch sessions successfully.`);
      setShowGenerateModal(false);
      fetchBatchData();
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await v1AcademicsClient.createSchedule({
      batchId: selectedBatchId,
      dayOfWeek: scheduleForm.dayOfWeek,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      room: scheduleForm.room || undefined,
    });

    setActionLoading(false);
    if (!res.success) {
      setError(res.error?.message || 'Failed to create schedule rule.');
    } else {
      setSuccessMsg('Schedule rule added successfully.');
      setShowCreateScheduleModal(false);
      fetchBatchData();
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule rule?')) return;
    setActionLoading(true);
    const res = await v1AcademicsClient.deleteSchedule(id, selectedBatchId);
    setActionLoading(false);
    if (!res.success) {
      setError(res.error?.message || 'Failed to delete schedule rule.');
    } else {
      setSuccessMsg('Schedule rule deleted.');
      fetchBatchData();
    }
  };

  return (
    <div className="space-y-6" data-testid="sessions-view">
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

      {error && (
        <Alert variant="destructive">
          <p className="text-xs">{error}</p>
        </Alert>
      )}

      {successMsg && (
        <Alert variant="default" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200">
          <p className="text-xs">{successMsg}</p>
        </Alert>
      )}

      {/* Operational Table for Batch Sessions */}
      <SessionOperationalTable
        canRecordAttendance={hasMutationCapability}
        onTakeAttendance={(sess) => onNavigateToAttendance(sess.id, sess.batchId)}
      />
    </div>
  );
};
