'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@coaching-os/ui';
import { ArrowRightLeft, AlertTriangle, X } from 'lucide-react';
import type { EnrichedEnrollmentDTO, BatchSummary } from '../types/enrollment-ui.types';

export interface EnrollmentTransferModalProps {
  enrollment: EnrichedEnrollmentDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmTransfer: (
    enrollmentId: string,
    targetBatchId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  batches: BatchSummary[];
}

export function EnrollmentTransferModal({
  enrollment,
  isOpen,
  onClose,
  onConfirmTransfer,
  batches,
}: EnrollmentTransferModalProps) {
  const [targetBatchId, setTargetBatchId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(false);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setTargetBatchId('');
      setErrorMsg(null);
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

  if (!isOpen || !enrollment) return null;

  const studentName = enrollment.student?.displayName || `Student ${enrollment.studentId.slice(0, 8)}`;
  const currentBatchName = enrollment.batch?.name || `Batch ${enrollment.batchId.slice(0, 8)}`;

  const availableBatches = batches.filter((b) => b.id !== enrollment.batchId);
  const selectedDestinationBatch = availableBatches.find((b) => b.id === targetBatchId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBatchId) {
      setErrorMsg('Please select a destination batch.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await onConfirmTransfer(enrollment.id, targetBatchId);
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else if (result.error) {
      setErrorMsg(result.error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-form-title"
      data-testid="enrollment-transfer-modal"
    >
      <div className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-purple-600" aria-hidden="true" />
            <h2 id="transfer-form-title" className="text-lg font-bold text-[hsl(var(--foreground))]">
              Transfer Student Enrollment
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal" className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm" data-testid="transfer-enrollment-form">
          {errorMsg && (
            <div
              id="transfer-form-error"
              className="p-3 text-xs rounded-md bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
              role="alert"
              aria-live="polite"
              data-testid="transfer-form-error"
            >
              {errorMsg}
            </div>
          )}

          {/* Current Context */}
          <div className="rounded-lg border border-[hsl(var(--border))] p-3.5 bg-[hsl(var(--muted)/0.3)] space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Student:</span>
              <span className="font-semibold text-[hsl(var(--foreground))]">{studentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Current Batch:</span>
              <span className="font-medium text-[hsl(var(--foreground))]">{currentBatchName}</span>
            </div>
          </div>

          {/* Target Batch */}
          <div className="space-y-1.5">
            <label htmlFor="target-batch-select" className="text-xs font-semibold text-[hsl(var(--foreground))]">
              Destination Batch <span className="text-rose-500">*</span>
            </label>
            <select
              id="target-batch-select"
              value={targetBatchId}
              onChange={(e) => setTargetBatchId(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              required
              aria-required="true"
              aria-invalid={!targetBatchId && !!errorMsg}
              aria-describedby={errorMsg ? 'transfer-form-error' : undefined}
              data-testid="target-batch-select-dropdown"
              disabled={isSubmitting}
            >
              <option value="">-- Choose Destination Batch --</option>
              {availableBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name} {batch.code ? `(${batch.code})` : ''} — Cap: {batch.capacity}
                </option>
              ))}
            </select>
            {selectedDestinationBatch && (
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Destination: {selectedDestinationBatch.name} | Capacity: {selectedDestinationBatch.capacity}
              </p>
            )}
          </div>

          {/* Historical Preservation Warning */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:bg-amber-950/40 dark:border-amber-800 flex gap-2 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <span className="font-semibold">Historical Preservation Warning:</span>
              <p>
                Transferring does not simply change the batch reference. The current enrollment record will be permanently marked as <strong>TRANSFERRED</strong> and linked to a brand-new destination enrollment record to preserve full historical audit logs.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[hsl(var(--border))]">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !targetBatchId}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="submit-transfer-button"
            >
              {isSubmitting ? 'Transferring...' : 'Confirm Atomic Transfer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
