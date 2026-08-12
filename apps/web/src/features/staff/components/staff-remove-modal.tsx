'use client';

import React, { useState, useEffect } from 'react';
import { Button, Alert, AlertDescription } from '@coaching-os/ui';
import { Trash2, AlertCircle, Loader2, X } from 'lucide-react';
import type { StaffMembershipDTO } from '../types/staff-ui.types';

interface StaffRemoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: StaffMembershipDTO | null;
  onConfirmRemove: (memberId: string) => Promise<{ success: boolean; error?: string }>;
}

export function StaffRemoveModal({
  isOpen,
  onClose,
  member,
  onConfirmRemove,
}: StaffRemoveModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [prevMemberId, setPrevMemberId] = useState<string | null>(null);

  const currentMemberId = member?.id ?? null;
  if (currentMemberId !== prevMemberId) {
    setPrevMemberId(currentMemberId);
    setErrorMsg(null);
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

  if (!isOpen || !member) return null;

  const handleRemove = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await onConfirmRemove(member.id);
      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error || 'Failed to remove staff membership.');
      }
    } catch {
      setErrorMsg('An unexpected network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-remove-title"
      data-testid="staff-remove-modal"
    >
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 text-foreground relative animate-in fade-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground rounded-sm p-1 transition-colors disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div>
          <h2 id="staff-remove-title" className="text-lg font-bold text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
            Remove Staff Member
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Are you sure you want to permanently remove <span className="font-semibold text-foreground">{member.user?.name || member.userId}</span> from this institute?
          </p>
        </div>

        <div className="space-y-3">
          <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20" data-testid="remove-consequence-warning">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription className="text-xs">
              <strong>Consequence:</strong> The staff member will immediately lose all access to institute data, classes, schedules, and management tools. This action is recorded in the security audit log.
            </AlertDescription>
          </Alert>

          {errorMsg && (
            <Alert variant="destructive" data-testid="staff-remove-error">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} size="sm">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={isSubmitting}
            size="sm"
            data-testid="staff-remove-confirm-button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
                Removing...
              </>
            ) : (
              'Confirm Removal'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
