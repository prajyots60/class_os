import * as React from 'react';
import { Button, Card, Badge, Spinner, Alert, Input, Textarea, Label } from '@coaching-os/ui';
import { v1AcademicsClient } from '../api/v1-academics-client';
import { fetchBatchesList } from '../api/academic-api';
import { PublishConfirmModal } from './PublishConfirmModal';
import type { V1HomeworkDTO } from '../types/v1-academics-ui.types';
import type { BatchDTO } from '@coaching-os/identity/client';

interface HomeworkViewProps {
  initialBatchId?: string;
  hasMutationCapability: boolean;
}

export const HomeworkView: React.FC<HomeworkViewProps> = ({
  initialBatchId,
  hasMutationCapability,
}) => {
  const [batches, setBatches] = React.useState<BatchDTO[]>([]);
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>(initialBatchId || '');
  const [homeworkList, setHomeworkList] = React.useState<V1HomeworkDTO[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [actionLoading, setActionLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [editingHomework, setEditingHomework] = React.useState<V1HomeworkDTO | null>(null);
  const [publishingHomeworkId, setPublishingHomeworkId] = React.useState<string | null>(null);

  // Form State
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    attachmentUrl: '',
    dueDate: '',
  });

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

  // Load homework for selected batch
  const fetchHomeworkList = React.useCallback(async () => {
    if (!selectedBatchId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await v1AcademicsClient.listHomework(selectedBatchId);
      if (res.success && res.data) {
        setHomeworkList(res.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load homework');
    } finally {
      setLoading(false);
    }
  }, [selectedBatchId]);

  React.useEffect(() => {
    let mounted = true;
    async function loadData() {
      if (!selectedBatchId) return;
      try {
        const res = await v1AcademicsClient.listHomework(selectedBatchId);
        if (mounted && res.success && res.data) {
          setHomeworkList(res.data);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load homework');
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

  // Actions
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) return;
    setActionLoading(true);
    setError(null);

    const res = await v1AcademicsClient.createHomework({
      batchId: selectedBatchId,
      title: formData.title,
      description: formData.description,
      attachmentUrl: formData.attachmentUrl || undefined,
      dueDate: formData.dueDate || undefined,
    });

    setActionLoading(false);
    if (!res.success) {
      setError(res.error?.message || 'Failed to create homework.');
    } else {
      setSuccessMsg('Homework draft created.');
      setShowCreateModal(false);
      setFormData({ title: '', description: '', attachmentUrl: '', dueDate: '' });
      fetchHomeworkList();
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHomework) return;
    setActionLoading(true);
    setError(null);

    const res = await v1AcademicsClient.updateHomework(editingHomework.id, {
      title: formData.title,
      description: formData.description,
      attachmentUrl: formData.attachmentUrl || undefined,
      dueDate: formData.dueDate || undefined,
    });

    setActionLoading(false);
    if (!res.success) {
      setError(res.error?.message || 'Failed to update homework draft.');
    } else {
      setSuccessMsg('Homework draft updated.');
      setEditingHomework(null);
      fetchHomeworkList();
    }
  };

  const handlePublishConfirm = async () => {
    if (!publishingHomeworkId) return;
    setActionLoading(true);
    setError(null);

    const res = await v1AcademicsClient.publishHomework(publishingHomeworkId);
    setActionLoading(false);
    setPublishingHomeworkId(null);

    if (!res.success) {
      setError(res.error?.message || 'Failed to publish homework.');
    } else {
      setSuccessMsg('Homework successfully PUBLISHED.');
      fetchHomeworkList();
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft homework?')) return;
    setActionLoading(true);
    const res = await v1AcademicsClient.deleteHomework(id);
    setActionLoading(false);
    if (!res.success) {
      setError(res.error?.message || 'Failed to delete draft homework.');
    } else {
      setSuccessMsg('Draft homework deleted.');
      fetchHomeworkList();
    }
  };

  const openEditModal = (hw: V1HomeworkDTO) => {
    setEditingHomework(hw);
    setFormData({
      title: hw.title,
      description: hw.description,
      attachmentUrl: hw.attachmentUrl || '',
      dueDate: hw.dueDate ? hw.dueDate.split('T')[0] : '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Batch Selector */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Label htmlFor="hw-batch-select" className="font-semibold text-foreground">
            Select Batch:
          </Label>
          <select
            id="hw-batch-select"
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
            + Create Homework Draft
          </Button>
        )}
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}
      {successMsg && <Alert variant="info">{successMsg}</Alert>}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : homeworkList.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No homework has been created for this batch yet.
        </Card>
      ) : (
        <div className="space-y-4">
          {homeworkList.map((hw) => (
            <Card key={hw.id} className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-foreground text-base">{hw.title}</h4>
                  <Badge variant={hw.isPublished ? 'success' : 'warning'}>
                    {hw.isPublished ? 'PUBLISHED' : 'DRAFT'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{hw.description}</p>

                {hw.attachmentUrl && (
                  <p className="text-xs text-primary">
                    <span className="font-semibold text-muted-foreground">Attachment:</span>{' '}
                    <a href={hw.attachmentUrl} target="_blank" rel="noreferrer" className="underline">
                      {hw.attachmentUrl}
                    </a>
                  </p>
                )}

                {hw.dueDate && (
                  <p className="text-xs text-muted-foreground">
                    Due Date: <span className="font-medium text-foreground">{hw.dueDate.split('T')[0]}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                {!hw.isPublished && hasMutationCapability && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => openEditModal(hw)}>
                      Edit Draft
                    </Button>
                    <Button variant="default" size="sm" onClick={() => setPublishingHomeworkId(hw.id)}>
                      Publish
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteDraft(hw.id)}>
                      Delete
                    </Button>
                  </>
                )}

                {hw.isPublished && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    Read-Only (Published)
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-bold text-foreground">Create Homework Draft</h3>
            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="hw-title">Title</Label>
                <Input
                  id="hw-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Physics Chapter 3 Questions"
                  required
                />
              </div>
              <div>
                <Label htmlFor="hw-desc">Description</Label>
                <Textarea
                  id="hw-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter detailed instructions for students..."
                  required
                />
              </div>
              <div>
                <Label htmlFor="hw-url">Attachment / Reference URL (Optional)</Label>
                <Input
                  id="hw-url"
                  type="url"
                  value={formData.attachmentUrl}
                  onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
                  placeholder="https://example.com/homework.pdf"
                />
              </div>
              <div>
                <Label htmlFor="hw-due">Due Date (Optional)</Label>
                <Input
                  id="hw-due"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="default" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save Draft'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingHomework && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-bold text-foreground">Edit Homework Draft</h3>
            <form onSubmit={handleUpdateSubmit} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="edit-hw-title">Title</Label>
                <Input
                  id="edit-hw-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-hw-desc">Description</Label>
                <Textarea
                  id="edit-hw-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-hw-url">Attachment URL</Label>
                <Input
                  id="edit-hw-url"
                  type="url"
                  value={formData.attachmentUrl}
                  onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingHomework(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="default" disabled={actionLoading}>
                  {actionLoading ? 'Updating...' : 'Update Draft'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Publish Confirm Modal */}
      <PublishConfirmModal
        isOpen={!!publishingHomeworkId}
        onClose={() => setPublishingHomeworkId(null)}
        onConfirm={handlePublishConfirm}
        title="Publish Homework?"
        description="After publishing, students in this batch will receive access and homework content will become strictly read-only."
        isLoading={actionLoading}
      />
    </div>
  );
};
