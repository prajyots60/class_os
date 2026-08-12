'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@coaching-os/ui';
import { X, Loader2, AlertCircle } from 'lucide-react';
import type { ProgramDTO, SubjectDTO } from '@coaching-os/identity/client';
import type { CreateProgramSubjectFormValues } from '../types/academic-ui.types';

export interface ProgramSubjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CreateProgramSubjectFormValues) => Promise<void>;
  programs: ProgramDTO[];
  subjects: SubjectDTO[];
  preselectedProgramId?: string;
  isSubmitting: boolean;
  serverError?: string | null;
}

export function ProgramSubjectFormModal({
  isOpen,
  onClose,
  onSubmit,
  programs,
  subjects,
  preselectedProgramId,
  isSubmitting,
  serverError,
}: ProgramSubjectFormModalProps) {
  const [programId, setProgramId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [prevIsOpen, setPrevIsOpen] = useState(false);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setProgramId(preselectedProgramId || (programs.length > 0 ? programs[0].id : ''));
      setSubjectId(subjects.length > 0 ? subjects[0].id : '');
      setFieldErrors({});
    }
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

    if (!programId) {
      errors.programId = 'Please select a program.';
    }
    if (!subjectId) {
      errors.subjectId = 'Please select a subject.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateForm()) return;

    await onSubmit({ programId, subjectId });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-modal-title"
    >
      <div className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <h2 id="map-modal-title" className="text-base font-semibold text-[hsl(var(--foreground))]">
            Map Subject to Program
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
              Select Program <span className="text-destructive">*</span>
            </label>
            <select
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              disabled={isSubmitting}
              data-testid="program-select-dropdown"
              className="w-full h-9 px-3 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
            >
              <option value="">-- Choose Program --</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
            {fieldErrors.programId && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.programId}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">
              Select Subject <span className="text-destructive">*</span>
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={isSubmitting}
              data-testid="subject-select-dropdown"
              className="w-full h-9 px-3 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
            >
              <option value="">-- Choose Subject --</option>
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="mapping-form-submit-button" className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Map Subject
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
