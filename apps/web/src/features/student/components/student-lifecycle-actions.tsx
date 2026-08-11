'use client';

import React, { useEffect } from 'react';
import { Button } from '@coaching-os/ui';
import { Power, PowerOff, Archive, AlertCircle, Loader2, X } from 'lucide-react';
import type { StudentDTO } from '../types/student-ui.types';

export interface StudentLifecycleModalProps {
  isOpen: boolean;
  type: 'activate' | 'deactivate' | 'archive' | null;
  student: StudentDTO | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
  error?: string | null;
}

export function StudentLifecycleModal({
  isOpen,
  type,
  student,
  onClose,
  onConfirm,
  isSubmitting,
  error,
}: StudentLifecycleModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !type || !student) return null;

  const title =
    type === 'activate'
      ? 'Activate Student Standing'
      : type === 'deactivate'
        ? 'Deactivate Student Standing'
        : 'Archive Student Record';

  const description =
    type === 'activate'
      ? `Reactivate ${student.displayName} (Adm No: ${student.admissionNumber}) to active standing?`
      : type === 'deactivate'
        ? `Set ${student.displayName} (Adm No: ${student.admissionNumber}) to inactive standing? The student will remain admitted.`
        : `Are you sure you want to archive ${student.displayName} (Adm No: ${student.admissionNumber})? Archiving is a soft operation that sets status to Archived. The student record will remain in the database for historical compliance.`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lifecycle-modal-title"
    >
      <div className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center gap-2">
            {type === 'activate' && <Power className="h-5 w-5 text-emerald-600" />}
            {type === 'deactivate' && <PowerOff className="h-5 w-5 text-amber-600" />}
            {type === 'archive' && <Archive className="h-5 w-5 text-destructive" />}
            <h2 id="lifecycle-modal-title" className="text-base font-semibold text-[hsl(var(--foreground))]">
              {title}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting} aria-label="Close modal" className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <div className="p-4 mx-6 mt-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs text-destructive font-medium">{error}</div>
          </div>
        )}

        <div className="p-6">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isSubmitting}
            variant={type === 'archive' ? 'destructive' : 'default'}
            className="gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {type === 'activate' ? 'Activate' : type === 'deactivate' ? 'Deactivate' : 'Archive Record'}
          </Button>
        </div>
      </div>
    </div>
  );
}
