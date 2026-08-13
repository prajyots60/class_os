import * as React from 'react';
import { Button, Alert, Spinner, Input } from '@coaching-os/ui';
import { v1AcademicsClient } from '../api/v1-academics-client';
import { PublishConfirmModal } from './PublishConfirmModal';
import type { V1TestDTO, V1MarksDTO } from '../types/v1-academics-ui.types';

interface StudentMarkRow {
  enrollmentId: string;
  studentName: string;
  admissionNumber: string;
  marksObtained: string;
  isAbsent: boolean;
  error?: string;
}

interface BulkMarksModalProps {
  test: V1TestDTO;
  batchId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  hasMutationCapability: boolean;
}

export const BulkMarksModal: React.FC<BulkMarksModalProps> = ({
  test,
  batchId,
  isOpen,
  onClose,
  onSuccess,
  hasMutationCapability,
}) => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const [rows, setRows] = React.useState<StudentMarkRow[]>([]);
  const [showPublishConfirm, setShowPublishConfirm] = React.useState(false);

  // Load roster and existing marks inside useEffect
  React.useEffect(() => {
    let mounted = true;
    if (!isOpen) return;

    async function loadRosterAndMarks() {
      setLoading(true);
      setApiError(null);
      try {
        const enrollRes = await fetch(`/api/v1/enrollments?batchId=${batchId}`);
        const enrollData = await enrollRes.json();

        const existingMarksRes = await v1AcademicsClient.getMarks(test.id);
        const existingMarksMap: Record<string, V1MarksDTO> = {};
        if (mounted && existingMarksRes.success && existingMarksRes.data) {
          for (const m of existingMarksRes.data) {
            existingMarksMap[m.enrollmentId] = m;
          }
        }

        const initialRows: StudentMarkRow[] = [];
        if (mounted && enrollRes.ok && enrollData.data) {
          for (const item of enrollData.data) {
            if (item.status === 'active' && item.student) {
              const existing = existingMarksMap[item.id];
              initialRows.push({
                enrollmentId: item.id,
                studentName: `${item.student.firstName} ${item.student.lastName}`,
                admissionNumber: item.student.admissionNumber,
                marksObtained: existing ? String(existing.marksObtained) : '0',
                isAbsent: existing ? existing.isAbsent : false,
              });
            }
          }
        }

        if (mounted) {
          setRows(initialRows);
        }
      } catch (err: unknown) {
        if (mounted) {
          setApiError(err instanceof Error ? err.message : 'Failed to load roster or marks.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadRosterAndMarks();
    return () => {
      mounted = false;
    };
  }, [isOpen, batchId, test.id]);

  if (!isOpen) return null;

  const validateRow = (row: StudentMarkRow): string | undefined => {
    if (row.isAbsent) return undefined;
    const val = parseFloat(row.marksObtained);
    if (isNaN(val)) return 'Invalid number';
    if (val < 0) return 'Cannot be negative';
    if (val > test.maximumMarks) return `Cannot exceed max (${test.maximumMarks})`;
    const decimalParts = row.marksObtained.split('.')[1];
    if (decimalParts && decimalParts.length > 2) return 'Max 2 decimal places';
    return undefined;
  };

  const handleMarkChange = (enrollmentId: string, val: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.enrollmentId !== enrollmentId) return r;
        const updated = { ...r, marksObtained: val };
        updated.error = validateRow(updated);
        return updated;
      }),
    );
  };

  const handleAbsentToggle = (enrollmentId: string, isAbsent: boolean) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.enrollmentId !== enrollmentId) return r;
        const updated = { ...r, isAbsent, marksObtained: isAbsent ? '0' : r.marksObtained };
        updated.error = validateRow(updated);
        return updated;
      }),
    );
  };

  const handleSaveMarks = async (): Promise<boolean> => {
    let hasErr = false;
    const validatedRows = rows.map((r) => {
      const err = validateRow(r);
      if (err) hasErr = true;
      return { ...r, error: err };
    });
    setRows(validatedRows);

    if (hasErr) {
      setApiError('Please fix validation errors before saving.');
      return false;
    }

    setSaving(true);
    setApiError(null);

    const records = validatedRows.map((r) => ({
      enrollmentId: r.enrollmentId,
      marksObtained: parseFloat(r.marksObtained) || 0,
      isAbsent: r.isAbsent,
    }));

    const res = await v1AcademicsClient.enterMarks(test.id, { records });
    setSaving(false);

    if (!res.success) {
      setApiError(res.error?.message || 'Failed to save marks.');
      return false;
    }

    setSuccessMsg('Bulk marks saved successfully.');
    return true;
  };

  const handlePublishResults = async () => {
    const saved = await handleSaveMarks();
    if (!saved) return;

    setShowPublishConfirm(true);
  };

  const executePublish = async () => {
    setSaving(true);
    const res = await v1AcademicsClient.publishTestResults(test.id);
    setSaving(false);
    setShowPublishConfirm(false);

    if (!res.success) {
      setApiError(res.error?.message || 'Failed to publish test results.');
    } else {
      onSuccess();
      onClose();
    }
  };

  const isPublished = test.status === 'published';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl my-8 rounded-lg border border-border bg-background p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">{test.title} — Marks Entry</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Maximum Marks: <span className="font-semibold text-foreground">{test.maximumMarks}</span> | Status: <span className="font-semibold text-foreground">{test.status.toUpperCase()}</span>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          {apiError && <Alert variant="destructive">{apiError}</Alert>}
          {successMsg && <Alert variant="info">{successMsg}</Alert>}

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Adm #</th>
                    <th className="p-3 w-28">Status</th>
                    <th className="p-3 w-40">Marks Obtained</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.enrollmentId} className={row.error ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                      <td className="p-3 font-medium text-foreground">{row.studentName}</td>
                      <td className="p-3 text-xs text-muted-foreground">{row.admissionNumber}</td>
                      <td className="p-3">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            disabled={isPublished || !hasMutationCapability}
                            checked={row.isAbsent}
                            onChange={(e) => handleAbsentToggle(row.enrollmentId, e.target.checked)}
                            className="rounded border-input text-primary focus:ring-primary"
                          />
                          <span>Absent</span>
                        </label>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <Input
                            type="number"
                            step="0.01"
                            disabled={row.isAbsent || isPublished || !hasMutationCapability}
                            value={row.isAbsent ? '0' : row.marksObtained}
                            onChange={(e) => handleMarkChange(row.enrollmentId, e.target.value)}
                            className={`w-32 py-1 text-sm ${row.error ? 'border-red-500 focus:ring-red-500' : ''}`}
                          />
                          {row.error && <p className="text-xs text-red-600 font-medium">{row.error}</p>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>

            {!isPublished && hasMutationCapability && (
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => handleSaveMarks()} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Draft Marks'}
                </Button>
                <Button variant="default" onClick={handlePublishResults} disabled={saving}>
                  Publish Results
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <PublishConfirmModal
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={executePublish}
        title="Publish Test Results?"
        description="After publishing, marks and test configurations will be permanently frozen and viewable by students/parents."
        isLoading={saving}
      />
    </div>
  );
};
