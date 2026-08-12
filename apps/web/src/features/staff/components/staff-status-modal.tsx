'use client';

import React, { useState, useEffect } from 'react';
import { Button, Alert, AlertDescription } from '@coaching-os/ui';
import { UserX, UserCheck, AlertCircle, Loader2, X } from 'lucide-react';
import type { StaffMembershipDTO } from '../types/staff-ui.types';

interface StaffStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: StaffMembershipDTO | null;
  actionType: 'suspend' | 'activate' | null;
  onConfirmStatusChange: (memberId: string, action: 'suspend' | 'activate') => Promise<{ success: boolean; error?: string }>;
}

export function StaffStatusModal({
  isOpen,
  onClose,
  member,
  actionType,
  onConfirmStatusChange,
}: StaffStatusModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [prevMemberId, setPrevMemberId] = useState<string | null>(null);
  const [prevActionType, setPrevActionType] = useState<string | null>(null);

  const currentMemberId = member?.id ?? null;
  if (currentMemberId !== prevMemberId || actionType !== prevActionType) {
    setPrevMemberId(currentMemberId);
    setPrevActionType(actionType);
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

  if (!isOpen || !member || !actionType) return null;

  const isSuspend = actionType === 'suspend';

  const handleConfirm = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await onConfirmStatusChange(member.id, actionType);
      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error || `Failed to ${actionType} staff member.`);
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
      aria-labelledby="staff-status-title"
      data-testid="staff-status-modal"
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
          <h2 id="staff-status-title" className="text-lg font-bold text-foreground flex items-center gap-2">
            {isSuspend ? (
              <UserX className="h-5 w-5 text-amber-600" aria-hidden="true" />
            ) : (
              <UserCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            )}
            {isSuspend ? 'Suspend Staff Member' : 'Activate Staff Member'}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {isSuspend
              ? `Are you sure you want to suspend ${member.user?.name || member.userId}? They will temporarily lose workspace staff access.`
              : `Are you sure you want to reactivate ${member.user?.name || member.userId}? Their staff access will be restored.`}
          </p>
        </div>

        {errorMsg && (
          <Alert variant="destructive" data-testid="staff-status-error">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <div className="pt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} size="sm">
            Cancel
          </Button>
          <Button
            variant={isSuspend ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isSubmitting}
            size="sm"
            data-testid="staff-status-confirm-button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
                {isSuspend ? 'Suspending...' : 'Activating...'}
              </>
            ) : isSuspend ? (
              'Suspend Member'
            ) : (
              'Activate Member'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
