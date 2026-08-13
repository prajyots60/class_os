import * as React from 'react';
import { Button, Card, Badge, Spinner, Alert } from '@coaching-os/ui';
import { v1AcademicsClient } from '../api/v1-academics-client';
import { fetchBatchesList } from '../api/academic-api';
import type { V1BatchSessionDTO } from '../types/v1-academics-ui.types';
import type { BatchDTO } from '@coaching-os/identity/client';

interface AcademicOverviewViewProps {
  onNavigateToTab: (tab: 'sessions' | 'attendance' | 'homework' | 'tests', context?: { sessionId?: string; batchId?: string }) => void;
  hasMutationCapability: boolean;
}

export const AcademicOverviewView: React.FC<AcademicOverviewViewProps> = ({
  onNavigateToTab,
  hasMutationCapability,
}) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [batches, setBatches] = React.useState<BatchDTO[]>([]);
  const [todaySessions, setTodaySessions] = React.useState<V1BatchSessionDTO[]>([]);
  const [attendanceStatusMap, setAttendanceStatusMap] = React.useState<Record<string, boolean>>({});

  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);

  const refreshData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const batchesRes = await fetchBatchesList({ status: 'running' });
      if (!batchesRes.success) {
        setError(batchesRes.error?.message || 'Failed to load batches.');
        setLoading(false);
        return;
      }
      setBatches(batchesRes.data);

      const allSessions: V1BatchSessionDTO[] = [];
      const attMap: Record<string, boolean> = {};

      for (const b of batchesRes.data) {
        const sessRes = await v1AcademicsClient.listSessions({
          batchId: b.id,
          startDate: todayStr,
          endDate: todayStr,
        });
        if (sessRes.success && sessRes.data) {
          allSessions.push(...sessRes.data);
          for (const s of sessRes.data) {
            const attRes = await v1AcademicsClient.getAttendance(s.id);
            if (attRes.success && attRes.data && attRes.data.length > 0) {
              attMap[s.id] = true;
            }
          }
        }
      }

      setTodaySessions(allSessions);
      setAttendanceStatusMap(attMap);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred loading today&apos;s schedule.');
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  React.useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const batchesRes = await fetchBatchesList({ status: 'running' });
        if (!mounted) return;
        if (!batchesRes.success) {
          setError(batchesRes.error?.message || 'Failed to load batches.');
          setLoading(false);
          return;
        }
        setBatches(batchesRes.data);

        const allSessions: V1BatchSessionDTO[] = [];
        const attMap: Record<string, boolean> = {};

        for (const b of batchesRes.data) {
          const sessRes = await v1AcademicsClient.listSessions({
            batchId: b.id,
            startDate: todayStr,
            endDate: todayStr,
          });
          if (mounted && sessRes.success && sessRes.data) {
            allSessions.push(...sessRes.data);
            for (const s of sessRes.data) {
              const attRes = await v1AcademicsClient.getAttendance(s.id);
              if (mounted && attRes.success && attRes.data && attRes.data.length > 0) {
                attMap[s.id] = true;
              }
            }
          }
        }

        if (mounted) {
          setTodaySessions(allSessions);
          setAttendanceStatusMap(attMap);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred loading today&apos;s schedule.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [todayStr]);

  const getBatchName = (batchId: string) => {
    const b = batches.find((item) => item.id === batchId);
    return b ? `${b.name} (${b.code})` : 'Batch';
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
        <span className="ml-3 text-sm text-muted-foreground">Loading today&apos;s classes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between rounded-lg border border-border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Good day, Teacher 👋
          </h2>
          <p className="text-sm text-muted-foreground">
            Here are your scheduled classes for today (<span className="font-semibold text-foreground">{todayStr}</span>).
          </p>
        </div>
        <Button variant="outline" onClick={refreshData}>
          Refresh Schedule
        </Button>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      {/* Today's Classes List */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-foreground">Today&apos;s Classes</h3>

        {todaySessions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No classes scheduled for today.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check the Sessions &amp; Schedules tab to generate or view upcoming batch sessions.
            </p>
            <div className="mt-4">
              <Button variant="outline" onClick={() => onNavigateToTab('sessions')}>
                Go to Sessions &amp; Schedules
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {todaySessions.map((session) => {
              const isAttendanceTaken = !!attendanceStatusMap[session.id];
              const isCancelled = session.status === 'cancelled';
              const isCompleted = session.status === 'completed';

              return (
                <Card key={session.id} className="p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-foreground text-base">
                          {getBatchName(session.batchId)}
                        </h4>
                        <p className="text-sm font-medium text-muted-foreground mt-0.5">
                          {session.startTime} – {session.endTime}
                        </p>
                      </div>
                      <Badge
                        variant={
                          isCancelled ? 'destructive' : isCompleted ? 'success' : 'default'
                        }
                      >
                        {session.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Attendance:</span>
                      <Badge variant={isAttendanceTaken ? 'success' : 'warning'}>
                        {isAttendanceTaken ? 'Completed' : 'Not Taken'}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex flex-wrap items-center gap-2">
                    <Button
                      variant={isAttendanceTaken ? 'outline' : 'default'}
                      size="sm"
                      disabled={isCancelled || (!hasMutationCapability && !isAttendanceTaken)}
                      onClick={() => onNavigateToTab('attendance', { sessionId: session.id, batchId: session.batchId })}
                    >
                      {isAttendanceTaken ? 'View Attendance' : 'Take Attendance'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateToTab('homework', { batchId: session.batchId })}
                    >
                      Homework
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateToTab('tests', { batchId: session.batchId })}
                    >
                      Assessments
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
