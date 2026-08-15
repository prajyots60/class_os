'use client';

import * as React from 'react';
import { Button, Input, Label, Textarea } from '@coaching-os/ui';
import { Megaphone, X } from 'lucide-react';
import type {
  AnnouncementDTO,
  AnnouncementTargetType,
  CreateAnnouncementInput,
} from '../../types/communication-ui.types';

export interface AnnouncementEditorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateAnnouncementInput) => Promise<void>;
  initialData?: AnnouncementDTO | null;
  isSaving: boolean;
}

export function AnnouncementEditorSheet(props: AnnouncementEditorSheetProps) {
  if (!props.isOpen) return null;

  return (
    <AnnouncementEditorFormContent
      key={props.initialData?.id ?? (props.isOpen ? 'open' : 'closed')}
      {...props}
    />
  );
}

function AnnouncementEditorFormContent({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSaving,
}: AnnouncementEditorSheetProps) {
  const isEditing = Boolean(initialData);

  const [targetType, setTargetType] = React.useState<AnnouncementTargetType>(
    initialData?.targetType ?? 'institute',
  );
  const [targetBatchId, setTargetBatchId] = React.useState(initialData?.targetBatchId || '');
  const [title, setTitle] = React.useState(initialData?.title ?? '');
  const [body, setBody] = React.useState(initialData?.body ?? '');

  const [errors, setErrors] = React.useState<{
    title?: string;
    body?: string;
    targetBatchId?: string;
  }>({});

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: { title?: string; body?: string; targetBatchId?: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required.';
    } else if (title.trim().length > 200) {
      newErrors.title = 'Title must be 200 characters or less.';
    }

    if (!body.trim()) {
      newErrors.body = 'Body content is required.';
    } else if (body.trim().length > 5000) {
      newErrors.body = 'Body content must be 5000 characters or less.';
    }

    if (targetType === 'batch' && !targetBatchId.trim()) {
      newErrors.targetBatchId = 'Target Batch ID is required when targeting a batch.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSave({
      targetType,
      targetBatchId: targetType === 'batch' ? targetBatchId.trim() : null,
      title: title.trim(),
      body: body.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-editor-title"
    >
      <div className="relative w-full max-w-lg h-full bg-[hsl(var(--card))] border-l border-[hsl(var(--border))] shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h2 id="announcement-editor-title" className="text-lg font-bold text-[hsl(var(--foreground))]">
                {isEditing ? 'Edit Draft Announcement' : 'Create Draft Announcement'}
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Drafts can be previewed before publishing.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
            className="h-8 w-8 p-0"
            aria-label="Close sheet"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form id="announcement-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Target Scope */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Target Audience
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetType('institute')}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-1 ${
                  targetType === 'institute'
                    ? 'border-primary bg-primary/5 text-primary font-semibold'
                    : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--foreground))]'
                }`}
              >
                <span className="text-sm">Institute-Wide</span>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  All staff, students, and parents
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTargetType('batch')}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-1 ${
                  targetType === 'batch'
                    ? 'border-primary bg-primary/5 text-primary font-semibold'
                    : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--foreground))]'
                }`}
              >
                <span className="text-sm">Batch Targeted</span>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  Specific academic batch
                </span>
              </button>
            </div>
          </div>

          {/* Batch Selector if Target === batch */}
          {targetType === 'batch' && (
            <div className="space-y-1.5">
              <Label htmlFor="targetBatchId" className="text-xs font-semibold text-[hsl(var(--foreground))]">
                Batch ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="targetBatchId"
                placeholder="e.g. batch_xyz123"
                value={targetBatchId}
                onChange={(e) => setTargetBatchId(e.target.value)}
                className="text-sm"
              />
              {errors.targetBatchId && (
                <p className="text-xs text-destructive">{errors.targetBatchId}</p>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="title" className="text-xs font-semibold text-[hsl(var(--foreground))]">
                Announcement Title <span className="text-destructive">*</span>
              </Label>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                {title.length}/200
              </span>
            </div>
            <Input
              id="title"
              placeholder="e.g. Science Fair Schedule & Venue Details"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="text-sm font-medium"
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          {/* Body Content */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="body" className="text-xs font-semibold text-[hsl(var(--foreground))]">
                Announcement Body <span className="text-destructive">*</span>
              </Label>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                {body.length}/5000
              </span>
            </div>
            <Textarea
              id="body"
              placeholder="Write the details of your announcement here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              maxLength={5000}
              className="text-sm resize-none"
            />
            {errors.body && <p className="text-xs text-destructive">{errors.body}</p>}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="default" size="sm" type="submit" form="announcement-form" disabled={isSaving}>
            {isSaving ? 'Saving Draft...' : isEditing ? 'Update Draft' : 'Save Draft'}
          </Button>
        </div>
      </div>
    </div>
  );
}
