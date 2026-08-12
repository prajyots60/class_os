'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@coaching-os/ui';
import { X, Loader2, UserCheck, AlertCircle } from 'lucide-react';
import type { BatchDTO } from '@coaching-os/identity/client';
import type { StaffMemberDTO, AssignTeacherFormValues } from '../types/academic-ui.types';

export interface BatchTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: AssignTeacherFormValues) => Promise<void>;
  batch: BatchDTO | null;
  staff: StaffMemberDTO[];
  isSubmitting: boolean;
  serverError?: string | null;
}

export function BatchTeacherModal({
  isOpen,
  onClose,
  onSubmit,
  batch,
  staff,
  isSubmitting,
  serverError,
}: BatchTeacherModalProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [prevBatch, setPrevBatch] = useState<BatchDTO | null | undefined>(undefined);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(false);

  if (batch !== prevBatch || isOpen !== prevIsOpen) {
    setPrevBatch(batch);
    setPrevIsOpen(isOpen);
    if (batch) {
      setSelectedTeacherId(batch.teacherId || '');
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

  if (!isOpen || !batch) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    await onSubmit({
      teacherId: selectedTeacherId.trim() ? selectedTeacherId.trim() : null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="teacher-modal-title"
    >
      <div className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-[hsl(var(--primary))]" />
            <h2 id="teacher-modal-title" className="text-base font-semibold text-[hsl(var(--foreground))]">
              Assign Primary Teacher
            </h2>
          </div>
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
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
              Assigning primary teacher for batch{' '}
              <span className="font-semibold text-[hsl(var(--foreground))]">{batch.code} ({batch.name})</span>.
            </p>
            <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">
              Select Primary Teacher
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              disabled={isSubmitting}
              data-testid="assign-teacher-dropdown"
              className="w-full h-9 px-3 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
            >
              <option value="">-- Unassigned --</option>
              {staff.map((st) => (
                <option key={st.id} value={st.id}>
                  Staff Member ({st.role}) - ID: {st.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="assign-teacher-submit-button" className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Assignment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
