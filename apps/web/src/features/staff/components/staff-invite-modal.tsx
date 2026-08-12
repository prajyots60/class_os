'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Label, Alert, AlertDescription } from '@coaching-os/ui';
import { UserPlus, AlertCircle, Loader2, X } from 'lucide-react';
import type { StaffRole, InviteStaffFormValues } from '../types/staff-ui.types';

interface StaffInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (values: InviteStaffFormValues) => Promise<{ success: boolean; error?: string }>;
}

export function StaffInviteModal({ isOpen, onClose, onInvite }: StaffInviteModalProps) {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<StaffRole>('teacher');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!userId.trim()) {
      setErrorMsg('User ID is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onInvite({ userId: userId.trim(), role });
      if (res.success) {
        setUserId('');
        setRole('teacher');
        onClose();
      } else {
        setErrorMsg(res.error || 'Failed to invite staff member.');
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
      aria-labelledby="staff-invite-title"
      data-testid="staff-invite-modal"
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
          <h2 id="staff-invite-title" className="text-lg font-bold text-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
            Invite Staff Member
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Assign a staff role (`owner`, `teacher`, `assistant`) to a user in your institute.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <Alert variant="destructive" data-testid="staff-invite-error">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="staff-user-id">User ID *</Label>
            <Input
              id="staff-user-id"
              placeholder="Enter exact User UUID..."
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={!!errorMsg}
              data-testid="staff-invite-user-id-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staff-role-select">Staff Role *</Label>
            <select
              id="staff-role-select"
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              disabled={isSubmitting}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              data-testid="staff-invite-role-select"
            >
              <option value="teacher">Teacher</option>
              <option value="assistant">Assistant</option>
              <option value="owner">Owner (Elevated Admin)</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Teachers and Assistants get staff capabilities. Owners gain institute management rights.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !userId.trim()}
              size="sm"
              data-testid="staff-invite-submit-button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
                  Inviting...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
