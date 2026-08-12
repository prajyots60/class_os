'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input } from '@coaching-os/ui';
import { X, Loader2, AlertCircle } from 'lucide-react';
import type { BatchDTO, ProgramDTO, SubjectDTO } from '@coaching-os/identity/client';
import type { CreateBatchFormValues, EditBatchFormValues, StaffMemberDTO } from '../types/academic-ui.types';

export interface BatchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CreateBatchFormValues | EditBatchFormValues) => Promise<void>;
  batch?: BatchDTO | null;
  programs: ProgramDTO[];
  subjects: SubjectDTO[];
  staff: StaffMemberDTO[];
  isSubmitting: boolean;
  serverError?: string | null;
}

export function BatchFormModal({
  isOpen,
  onClose,
  onSubmit,
  batch,
  programs,
  subjects,
  staff,
  isSubmitting,
  serverError,
}: BatchFormModalProps) {
  const isEditMode = !!batch;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [programId, setProgramId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [capacity, setCapacity] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [prevBatch, setPrevBatch] = useState<BatchDTO | null | undefined>(undefined);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(false);

  if (batch !== prevBatch || isOpen !== prevIsOpen) {
    setPrevBatch(batch);
    setPrevIsOpen(isOpen);
    if (batch) {
      setCode(batch.code);
      setName(batch.name);
      setSubjectId(batch.subjectId);
      setProgramId(batch.programId || '');
      setTeacherId(batch.teacherId || '');
      setCapacity(batch.capacity ? batch.capacity.toString() : '');
      setStartDate(batch.startDate ? batch.startDate.split('T')[0] : '');
      setEndDate(batch.endDate ? batch.endDate.split('T')[0] : '');
    } else {
      setCode('');
      setName('');
      setSubjectId(subjects.length > 0 ? subjects[0].id : '');
      setProgramId('');
      setTeacherId('');
      setCapacity('');
      setStartDate('');
      setEndDate('');
    }
    setFieldErrors({});
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!isEditMode && !code.trim()) {
      errors.code = 'Batch code is required.';
    }

    if (!name.trim()) {
      errors.name = 'Batch name is required.';
    }

    if (!isEditMode && !subjectId) {
      errors.subjectId = 'Subject selection is required.';
    }

    if (capacity && (isNaN(Number(capacity)) || Number(capacity) <= 0)) {
      errors.capacity = 'Capacity must be a positive integer.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateForm()) return;

    const parsedCapacity = capacity.trim() ? parseInt(capacity.trim(), 10) : undefined;

    const values: CreateBatchFormValues | EditBatchFormValues = isEditMode
      ? {
          name: name.trim(),
          programId: programId || undefined,
          capacity: parsedCapacity,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }
      : {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          subjectId,
          programId: programId || undefined,
          teacherId: teacherId || undefined,
          capacity: parsedCapacity,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        };

    await onSubmit(values);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-modal-title"
    >
      <div className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <h2 id="batch-modal-title" className="text-lg font-semibold text-[hsl(var(--foreground))]">
            {isEditMode ? 'Edit Batch' : 'Create Batch'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {serverError && (
          <div className="p-4 mx-6 mt-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs text-destructive font-medium">{serverError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">
              Batch Code <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isEditMode || isSubmitting}
              placeholder="e.g. BATCH-2026-A"
              aria-invalid={!!fieldErrors.code}
              aria-describedby={fieldErrors.code ? 'batch-code-error' : undefined}
              className={fieldErrors.code ? 'border-destructive' : ''}
              data-testid="batch-code-input"
            />
            {isEditMode && (
              <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                Batch code is immutable once created.
              </p>
            )}
            {fieldErrors.code && (
              <p id="batch-code-error" className="mt-1 text-xs text-destructive">
                {fieldErrors.code}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">
              Batch Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Physics Target 2026 Morning"
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? 'batch-name-error' : undefined}
              className={fieldErrors.name ? 'border-destructive' : ''}
              data-testid="batch-name-input"
            />
            {fieldErrors.name && (
              <p id="batch-name-error" className="mt-1 text-xs text-destructive">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">
                Required Subject <span className="text-destructive">*</span>
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={isEditMode || isSubmitting}
                data-testid="batch-subject-select"
                className="w-full h-9 px-3 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
              {fieldErrors.subjectId && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.subjectId}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">
                Optional Program
              </label>
              <select
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                disabled={isSubmitting}
                data-testid="batch-program-select"
                className="w-full h-9 px-3 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
              >
                <option value="">None (Independent Batch)</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isEditMode && (
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">
                Assigned Primary Teacher (Optional)
              </label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                disabled={isSubmitting}
                data-testid="batch-teacher-select"
                className="w-full h-9 px-3 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
              >
                <option value="">Unassigned</option>
                {staff.map((st) => (
                  <option key={st.id} value={st.id}>
                    Staff Member ({st.role}) - {st.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">
                Capacity Limit
              </label>
              <Input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. 50"
                min={1}
                data-testid="batch-capacity-input"
              />
              {fieldErrors.capacity && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.capacity}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSubmitting}
                data-testid="batch-start-date-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isSubmitting}
                data-testid="batch-end-date-input"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="batch-form-submit-button" className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? 'Save Changes' : 'Create Batch'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
