'use client';

import React, { useState, useEffect } from 'react';
import { Button, Label, Alert, AlertDescription } from '@coaching-os/ui';
import { Shield, AlertTriangle, Loader2, X } from 'lucide-react';
import type { StaffMembershipDTO, StaffRole } from '../types/staff-ui.types';

interface StaffRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: StaffMembershipDTO | null;
  onUpdateRole: (memberId: string, role: StaffRole) => Promise<{ success: boolean; error?: string }>;
}

export function StaffRoleModal({ isOpen, onClose, member, onUpdateRole }: StaffRoleModalProps) {
  const [role, setRole] = useState<StaffRole>(member?.role || 'teacher');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [prevMemberId, setPrevMemberId] = useState<string | null>(null);

  const currentMemberId = member?.id ?? null;
  if (currentMemberId !== prevMemberId) {
    setPrevMemberId(currentMemberId);
    if (member) {
      setRole(member.role);
      setErrorMsg(null);
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

  if (!isOpen || !member) return null;

  const isPromotingToOwner = role === 'owner' && member.role !== 'owner';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await onUpdateRole(member.id, role);
      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error || 'Failed to update role.');
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
      aria-labelledby="staff-role-title"
      data-testid="staff-role-modal"
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
          <h2 id="staff-role-title" className="text-lg font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
            Change Staff Role
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Update role for staff member <span className="font-semibold text-foreground">{member.user?.name || member.userId}</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <Alert variant="destructive" data-testid="staff-role-error">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="change-staff-role">New Staff Role *</Label>
            <select
              id="change-staff-role"
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              disabled={isSubmitting}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              data-testid="staff-role-select"
            >
              <option value="teacher">Teacher</option>
              <option value="assistant">Assistant</option>
              <option value="owner">Owner (Elevated Admin)</option>
            </select>
          </div>

          {isPromotingToOwner && (
            <Alert className="bg-amber-50 text-amber-900 border-amber-200" data-testid="owner-warning">
              <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" />
              <AlertDescription className="text-xs">
                <strong>Warning:</strong> Promoting a user to <code>owner</code> grants full administrative control over institute settings, staff management, and billing.
              </AlertDescription>
            </Alert>
          )}

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
              disabled={isSubmitting || role === member.role}
              size="sm"
              data-testid="staff-role-submit-button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
                  Updating...
                </>
              ) : (
                'Update Role'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
