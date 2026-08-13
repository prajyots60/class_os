import * as React from 'react';
import { Button, Card, Badge, Spinner, Alert, Input, Label } from '@coaching-os/ui';
import { v1AcademicsClient } from '../api/v1-academics-client';
import { fetchBatchesList } from '../api/academic-api';
import { BulkMarksModal } from './BulkMarksModal';
import { PublishConfirmModal } from './PublishConfirmModal';
import type { V1TestDTO } from '../types/v1-academics-ui.types';
import type { BatchDTO } from '@coaching-os/identity/client';

interface AssessmentsViewProps {
  initialBatchId?: string;
  hasMutationCapability: boolean;
}

export const AssessmentsView: React.FC<AssessmentsViewProps> = ({
  initialBatchId,
  hasMutationCapability,
}) => {
  const [batches, setBatches] = React.useState<BatchDTO[]>([]);
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>(initialBatchId || '');
  const [tests, setTests] = React.useState<V1TestDTO[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [actionLoading, setActionLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [schedulingTest, setSchedulingTest] = React.useState<V1TestDTO | null>(null);
  const [marksTest, setMarksTest] = React.useState<V1TestDTO | null>(null);
  const [publishingTestId, setPublishingTestId] = React.useState<string | null>(null);

  // Form State
  const [createForm, setCreateForm] = React.useState({
    title: '',
    description: '',
    maximumMarks: '100',
    passingMarks: '40',
    scheduledDate: '',
  });

  const [scheduledDateInput, setScheduledDateInput] = React.useState('');

  // Load batches
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

  // Load tests for selected batch
  const fetchTestsList = React.useCallback(async () => {
    if (!selectedBatchId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await v1AcademicsClient.listTests(selectedBatchId);
      if (res.success && res.data) {
        setTests(res.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tests.');
    } finally {
      setLoading(false);
    }
  }, [selectedBatchId]);

  React.useEffect(() => {
    let mounted = true;
    async function loadData() {
      if (!selectedBatchId) return;
      try {
        const res = await v1AcademicsClient.listTests(selectedBatchId);
        if (mounted && res.success && res.data) {
          setTests(res.data);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load tests.');
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
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) return;
    setActionLoading(true);
    setError(null);

    const maxMarks = parseInt(createForm.maximumMarks, 10);
    const passMarks = createForm.passingMarks ? parseInt(createForm.passingMarks, 10) : undefined;

    const res = await v1AcademicsClient.createTest({
      batchId: selectedBatchId,
      title: createForm.title,
      description: createForm.description || undefined,
      maximumMarks: isNaN(maxMarks) ? 100 : maxMarks,
      passingMarks: passMarks,
      scheduledDate: createForm.scheduledDate || undefined,
    });

    setActionLoading(false);
    if (!res.success) {
      setError(res.error?.message || 'Failed to create assessment.');
    } else {
      setSuccessMsg('Assessment created successfully.');
      setShowCreateModal(false);
      setCreateForm({ title: '', description: '', maximumMarks: '100', passingMarks: '40', scheduledDate: '' });
      fetchTestsList();
    }
  };

  const handleScheduleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingTest) return;
    setActionLoading(true);
    setError(null);

    const res = await v1AcademicsClient.scheduleTest(schedulingTest.id, scheduledDateInput);
    setActionLoading(false);
    setSchedulingTest(null);

    if (!res.success) {
      setError(res.error?.message || 'Failed to schedule test date.');
    } else {
      setSuccessMsg('Test date scheduled successfully.');
      fetchTestsList();
    }
  };

  const handlePublishTestConfirm = async () => {
    if (!publishingTestId) return;
    setActionLoading(true);
    setError(null);

    const res = await v1AcademicsClient.publishTestResults(publishingTestId);
    setActionLoading(false);
    setPublishingTestId(null);

    if (!res.success) {
      setError(res.error?.message || 'Failed to publish test results.');
    } else {
      setSuccessMsg('Test results successfully PUBLISHED.');
      fetchTestsList();
    }
  };

  const handleDeleteTest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this test draft?')) return;
    setActionLoading(true);
    const res = await v1AcademicsClient.deleteTest(id);
    setActionLoading(false);
    if (!res.success) {
      setError(res.error?.message || 'Failed to delete test.');
    } else {
      setSuccessMsg('Test deleted successfully.');
      fetchTestsList();
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'marks_entered':
        return 'default';
      case 'scheduled':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Batch Selector */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Label htmlFor="test-batch-select" className="font-semibold text-foreground">
            Select Batch:
          </Label>
          <select
            id="test-batch-select"
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
          <Button variant="default" size="sm" onClick={() => setShowCreateModal(true)}>
            + Create Assessment
          </Button>
        )}
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}
      {successMsg && <Alert variant="info">{successMsg}</Alert>}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : tests.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No assessments have been created for this batch yet.
        </Card>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => {
            const isPublished = test.status === 'published';

            return (
              <Card key={test.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-foreground text-base">{test.title}</h4>
                    <Badge variant={getStatusBadgeVariant(test.status)}>
                      {test.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Max Marks: <span className="font-semibold text-foreground">{test.maximumMarks}</span>
                    {test.passingMarks && (
                      <>
                        {' '}| Passing: <span className="font-semibold text-foreground">{test.passingMarks}</span>
                      </>
                    )}
                    {test.scheduledDate && (
                      <>
                        {' '}| Scheduled: <span className="font-semibold text-foreground">{test.scheduledDate.split('T')[0]}</span>
                      </>
                    )}
                  </p>
                  {test.description && <p className="text-xs text-muted-foreground">{test.description}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!isPublished && hasMutationCapability && (
                    <>
                      {test.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSchedulingTest(test);
                            setScheduledDateInput(test.scheduledDate ? test.scheduledDate.split('T')[0] : '');
                          }}
                        >
                          Schedule Date
                        </Button>
                      )}

                      <Button variant="default" size="sm" onClick={() => setMarksTest(test)}>
                        {test.status === 'marks_entered' ? 'Review / Edit Marks' : 'Enter Marks'}
                      </Button>

                      {test.status === 'marks_entered' && (
                        <Button variant="outline" size="sm" onClick={() => setPublishingTestId(test.id)}>
                          Publish Results
                        </Button>
                      )}

                      {test.status === 'draft' && (
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteTest(test.id)}>
                          Delete
                        </Button>
                      )}
                    </>
                  )}

                  {isPublished && (
                    <Button variant="outline" size="sm" onClick={() => setMarksTest(test)}>
                      View Results (Read-Only)
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Assessment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-bold text-foreground">Create Assessment</h3>
            <form onSubmit={handleCreateTest} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="test-title">Title</Label>
                <Input
                  id="test-title"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Physics Midterm Exam"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="max-marks">Max Marks</Label>
                  <Input
                    id="max-marks"
                    type="number"
                    min="1"
                    value={createForm.maximumMarks}
                    onChange={(e) => setCreateForm({ ...createForm, maximumMarks: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pass-marks">Passing Marks (Optional)</Label>
                  <Input
                    id="pass-marks"
                    type="number"
                    min="0"
                    value={createForm.passingMarks}
                    onChange={(e) => setCreateForm({ ...createForm, passingMarks: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="test-date">Scheduled Date (Optional)</Label>
                <Input
                  id="test-date"
                  type="date"
                  value={createForm.scheduledDate}
                  onChange={(e) => setCreateForm({ ...createForm, scheduledDate: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="default" disabled={actionLoading}>
                  {actionLoading ? 'Creating...' : 'Create Assessment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Test Date Modal */}
      {schedulingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-bold text-foreground">Schedule Assessment Date</h3>
            <form onSubmit={handleScheduleTest} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="sched-date">Scheduled Date</Label>
                <Input
                  id="sched-date"
                  type="date"
                  value={scheduledDateInput}
                  onChange={(e) => setScheduledDateInput(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setSchedulingTest(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="default" disabled={actionLoading}>
                  {actionLoading ? 'Scheduling...' : 'Schedule Date'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Marks Entry Modal */}
      {marksTest && (
        <BulkMarksModal
          test={marksTest}
          batchId={selectedBatchId}
          isOpen={!!marksTest}
          onClose={() => setMarksTest(null)}
          onSuccess={() => {
            setSuccessMsg('Marks updated successfully.');
            fetchTestsList();
          }}
          hasMutationCapability={hasMutationCapability}
        />
      )}

      {/* Publish Confirm Modal */}
      <PublishConfirmModal
        isOpen={!!publishingTestId}
        onClose={() => setPublishingTestId(null)}
        onConfirm={handlePublishTestConfirm}
        title="Publish Test Results?"
        description="After publishing, test configurations and student marks will be permanently frozen and viewable by students/parents."
        isLoading={actionLoading}
      />
    </div>
  );
};
