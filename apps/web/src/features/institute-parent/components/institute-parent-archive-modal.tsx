'use client';

import React, { useEffect } from 'react';
import { Button, Alert, AlertTitle, AlertDescription } from '@coaching-os/ui';
import { AlertTriangle, X } from 'lucide-react';
import type { InstituteParentDTO } from '../types/institute-parent-ui.types';

export interface InstituteParentArchiveModalProps {
  parent: InstituteParentDTO | null;
  isOpen: boolean;
  isSubmitting: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirmArchive: (id: string) => Promise<boolean>;
}

/**
 * InstituteParentArchiveModal — confirmation dialog for archiving parent record within tenant scope.
 */
export function InstituteParentArchiveModal({
  parent,
  isOpen,
  isSubmitting,
  error,
  onClose,
  onConfirmArchive,
}: InstituteParentArchiveModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !parent) return null;

  const displayName = parent.parentIdentity?.name || 'this parent record';

  const handleArchive = async () => {
    const success = await onConfirmArchive(parent.id);
    if (success) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-dialog-title"
      data-testid="archive-parent-modal"
    >
      <div className="relative w-full max-w-md rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] bg-white shadow-xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
          <div className="flex items-center space-x-2 text-[hsl(var(--destructive))]">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            <h3 id="archive-dialog-title" className="text-base font-bold text-[hsl(var(--foreground))]">
              Archive Parent?
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-8 w-8 p-0 rounded-full border-[hsl(var(--border))]"
            aria-label="Close archive dialog"
            data-testid="close-archive-btn"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="py-2 px-3 text-xs">
            <AlertTitle className="text-xs font-semibold">Archive Failed</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2 text-xs text-[hsl(var(--muted-foreground))]">
          <p className="font-medium text-[hsl(var(--foreground))]">
            Are you sure you want to archive <span className="font-bold">{displayName}</span>?
          </p>
          <p>
            This action removes the parent from the active parent list for this institute and updates their standing to <span className="font-semibold text-[hsl(var(--foreground))]">Inactive</span>.
          </p>
          <div className="p-3 rounded-md bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] text-[11px] text-[hsl(var(--foreground))]">
            <span className="font-bold uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))] block mb-0.5">
              Privacy & Data Policy
            </span>
            Their global CoachingOS parent identity and account access in other institutes remain completely unaffected.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[hsl(var(--border))]">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="border-[hsl(var(--border))]"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleArchive}
            disabled={isSubmitting}
            className="bg-[hsl(var(--destructive))] text-white hover:opacity-90"
            data-testid="confirm-archive-btn"
          >
            {isSubmitting ? 'Archiving...' : 'Archive Parent'}
          </Button>
        </div>
      </div>
    </div>
  );
}
