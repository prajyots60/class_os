'use client';

import React, { useState, useEffect } from 'react';
import { Button, Badge } from '@coaching-os/ui';
import { X, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import type { BatchDTO, BatchStatus } from '@coaching-os/identity/client';
import type { ChangeBatchStatusFormValues } from '../types/academic-ui.types';

export interface BatchStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ChangeBatchStatusFormValues) => Promise<void>;
  batch: BatchDTO | null;
  isSubmitting: boolean;
  serverError?: string | null;
}

const LEGAL_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  draft: ['open'],
  open: ['running'],
  running: ['completed'],
  completed: ['archived'],
  archived: [],
};

export function BatchStatusModal({
  isOpen,
  onClose,
  onSubmit,
  batch,
  isSubmitting,
  serverError,
}: BatchStatusModalProps) {
  const [targetStatus, setTargetStatus] = useState<BatchStatus | ''>('');
  const [prevBatch, setPrevBatch] = useState<BatchDTO | null | undefined>(undefined);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(false);

  const allowedTransitions = batch ? LEGAL_TRANSITIONS[batch.status as BatchStatus] || [] : [];

  if (batch !== prevBatch || isOpen !== prevIsOpen) {
    setPrevBatch(batch);
    setPrevIsOpen(isOpen);
    if (batch) {
      const allowed = LEGAL_TRANSITIONS[batch.status as BatchStatus] || [];
      setTargetStatus(allowed.length > 0 ? allowed[0] : '');
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
    if (isSubmitting || !targetStatus) return;

    await onSubmit({ status: targetStatus as BatchStatus });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
    >
      <div className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <h2 id="status-modal-title" className="text-base font-semibold text-[hsl(var(--foreground))]">
            Change Batch Lifecycle Status
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
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--muted)/0.3)] text-xs">
            <div>
              <span className="text-[hsl(var(--muted-foreground))] block">Current Status</span>
              <Badge variant="outline" className="capitalize mt-1">
                {batch.status}
              </Badge>
            </div>
            <ArrowRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <div>
              <span className="text-[hsl(var(--muted-foreground))] block">Target Status</span>
              {allowedTransitions.length > 0 ? (
                <Badge variant="default" className="capitalize mt-1">
                  {targetStatus || allowedTransitions[0]}
                </Badge>
              ) : (
                <span className="text-[11px] text-[hsl(var(--muted-foreground))] italic">Terminal State</span>
              )}
            </div>
          </div>

          {allowedTransitions.length > 0 ? (
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">
                Select Valid Transition
              </label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as BatchStatus)}
                disabled={isSubmitting}
                data-testid="batch-status-select"
                className="w-full h-9 px-3 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
              >
                {allowedTransitions.map((st) => (
                  <option key={st} value={st}>
                    {st.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-amber-500 font-medium">
              This batch is in a terminal state ({batch.status}) and cannot undergo further lifecycle status transitions.
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || allowedTransitions.length === 0}
              data-testid="batch-status-submit-button"
              className="gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Transition Status
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
