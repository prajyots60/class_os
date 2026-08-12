'use client';

import React, { useEffect } from 'react';
import { Button } from '@coaching-os/ui';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface PrimaryReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPrimaryName?: string | null;
  newPrimaryCandidateName?: string | null;
  isSubmitting?: boolean;
}

export function PrimaryReplacementModal({
  isOpen,
  onClose,
  onConfirm,
  currentPrimaryName = 'the current primary guardian',
  newPrimaryCandidateName = 'this guardian',
  isSubmitting = false,
}: PrimaryReplacementModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="primary-replacement-title"
      aria-describedby="primary-replacement-description"
      data-testid="primary-replacement-modal"
    >
      <div className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl p-6 space-y-4">
        <div className="flex items-start space-x-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 id="primary-replacement-title" className="text-base font-bold text-[hsl(var(--foreground))]">
              Make Primary Guardian?
            </h3>
            <p id="primary-replacement-description" className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5 leading-relaxed">
              <strong className="text-[hsl(var(--foreground))] font-semibold">{currentPrimaryName}</strong> is currently the primary guardian.
              <br />
              Making <strong className="text-[hsl(var(--foreground))] font-semibold">{newPrimaryCandidateName}</strong> primary will remove {currentPrimaryName}&apos;s primary designation.
              <br />
              <span className="mt-1 block font-medium">Continue?</span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[hsl(var(--border))]">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="border-[hsl(var(--border))]"
            data-testid="cancel-primary-replacement-btn"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5"
            data-testid="confirm-primary-replacement-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Promoting...</span>
              </>
            ) : (
              <span>Make Primary</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
