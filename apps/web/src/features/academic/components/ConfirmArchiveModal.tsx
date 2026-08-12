'use client';

import React, { useEffect } from 'react';
import { Button } from '@coaching-os/ui';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface ConfirmArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  isSubmitting: boolean;
  error?: string | null;
}

export function ConfirmArchiveModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Archive Record',
  isSubmitting,
  error,
}: ConfirmArchiveModalProps) {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-modal-title"
    >
      <div className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-500 shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 id="archive-modal-title" className="text-base font-semibold text-[hsl(var(--foreground))]">
              {title}
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              {description}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={isSubmitting}
            data-testid="archive-confirm-button"
            className="gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
