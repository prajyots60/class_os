'use client';

import React, { useEffect } from 'react';
import { Button } from '@coaching-os/ui';
import { ShieldAlert, Loader2 } from 'lucide-react';

export interface ArchiveGuardianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  guardianName?: string | null;
  relationshipTypeLabel?: string | null;
  isSubmitting?: boolean;
}

export function ArchiveGuardianModal({
  isOpen,
  onClose,
  onConfirm,
  guardianName = 'this guardian',
  relationshipTypeLabel = 'relationship',
  isSubmitting = false,
}: ArchiveGuardianModalProps) {
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
      aria-labelledby="archive-guardian-title"
      aria-describedby="archive-guardian-description"
      data-testid="archive-guardian-modal"
    >
      <div className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl p-6 space-y-4">
        <div className="flex items-start space-x-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 id="archive-guardian-title" className="text-base font-bold text-[hsl(var(--foreground))]">
              Archive Guardian Relationship?
            </h3>
            <p id="archive-guardian-description" className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5 leading-relaxed">
              This removes the <strong className="text-[hsl(var(--foreground))] font-semibold">{relationshipTypeLabel}</strong> relationship with{' '}
              <strong className="text-[hsl(var(--foreground))] font-semibold">{guardianName}</strong> from the student&apos;s active guardian list.
              <br />
              <span className="block mt-2 text-xs italic text-[hsl(var(--muted-foreground))]">
                The parent record and student record will not be deleted.
              </span>
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
            data-testid="cancel-archive-guardian-btn"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold gap-1.5"
            data-testid="confirm-archive-guardian-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Archiving...</span>
              </>
            ) : (
              <span>Archive Relationship</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
