'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@coaching-os/ui';
import { AlertTriangle, X } from 'lucide-react';
import type { EnrichedEnrollmentDTO } from '../types/enrollment-ui.types';

export type ConfirmationActionType = 'withdraw' | 'cancel' | 'archive';

export interface EnrollmentConfirmationModalProps {
  enrollment: EnrichedEnrollmentDTO | null;
  actionType: ConfirmationActionType | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function EnrollmentConfirmationModal({
  enrollment,
  actionType,
  isOpen,
  onClose,
  onConfirm,
}: EnrollmentConfirmationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(false);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !enrollment || !actionType) return null;

  const studentName = enrollment.student?.displayName || `Student ${enrollment.studentId.slice(0, 8)}`;
  const batchName = enrollment.batch?.name || `Batch ${enrollment.batchId.slice(0, 8)}`;

  let title = '';
  let description = '';
  let confirmButtonText = '';

  switch (actionType) {
    case 'withdraw':
      title = 'Withdraw Student from Batch';
      description = `Are you sure you want to mark ${studentName}'s enrollment in ${batchName} as WITHDRAWN? This is a terminal lifecycle transition.`;
      confirmButtonText = 'Confirm Withdrawal';
      break;
    case 'cancel':
      title = 'Cancel Pending Enrollment';
      description = `Are you sure you want to CANCEL ${studentName}'s pending enrollment in ${batchName}?`;
      confirmButtonText = 'Confirm Cancellation';
      break;
    case 'archive':
      title = 'Archive Enrollment Record';
      description = `Are you sure you want to ARCHIVE this enrollment record? It will be soft-deleted and removed from active staff workspace views.`;
      confirmButtonText = 'Confirm Archive';
      break;
  }

  const handleConfirmClick = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during confirmation.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      data-testid="enrollment-confirmation-modal"
    >
      <div className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" aria-hidden="true" />
            <h2 id="confirmation-modal-title" className="text-lg font-bold text-[hsl(var(--foreground))]">
              {title}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal" className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-3 text-sm text-[hsl(var(--foreground))]">
          {errorMsg && (
            <div
              className="p-3 text-xs rounded-md bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
              role="alert"
              aria-live="polite"
            >
              {errorMsg}
            </div>
          )}

          <p>{description}</p>

          <div className="rounded-lg border border-[hsl(var(--border))] p-3 bg-[hsl(var(--muted)/0.3)] space-y-1 text-xs text-[hsl(var(--muted-foreground))]">
            <div>Student: <span className="font-semibold text-[hsl(var(--foreground))]">{studentName}</span></div>
            <div>Batch: <span className="font-semibold text-[hsl(var(--foreground))]">{batchName}</span></div>
            <div>Current Status: <span className="font-semibold uppercase">{enrollment.status}</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmClick}
            disabled={isSubmitting}
            data-testid="confirm-modal-action-button"
          >
            {isSubmitting ? 'Processing...' : confirmButtonText}
          </Button>
        </div>
      </div>
    </div>
  );
}
