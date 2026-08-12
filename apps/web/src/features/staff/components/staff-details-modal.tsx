'use client';

import React, { useEffect } from 'react';
import { Button } from '@coaching-os/ui';
import { X, User, Shield, Calendar, Hash, Mail } from 'lucide-react';
import { StaffRoleBadge, StaffStatusBadge } from './staff-status-badge';
import type { StaffMembershipDTO } from '../types/staff-ui.types';

interface StaffDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: StaffMembershipDTO | null;
}

export function StaffDetailsModal({ isOpen, onClose, member }: StaffDetailsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !member) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-details-title"
      data-testid="staff-details-modal"
    >
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-5 text-foreground relative animate-in fade-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground rounded-sm p-1 transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div>
          <h2 id="staff-details-title" className="text-lg font-bold text-foreground flex items-center gap-2">
            <User className="h-5 w-5 text-primary" aria-hidden="true" />
            Staff Member Details
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Safe identity and tenant membership DTO summary.
          </p>
        </div>

        <div className="space-y-3 text-sm divide-y divide-border/60">
          <div className="pt-2 flex justify-between items-center">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" aria-hidden="true" /> Full Name
            </span>
            <span className="font-semibold text-foreground">{member.user?.name || 'N/A'}</span>
          </div>

          <div className="pt-3 flex justify-between items-center">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" /> Email Address
            </span>
            <span className="text-foreground break-all">{member.user?.email || 'N/A'}</span>
          </div>

          <div className="pt-3 flex justify-between items-center">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" /> Role
            </span>
            <StaffRoleBadge role={member.role} />
          </div>

          <div className="pt-3 flex justify-between items-center">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" /> Standing Status
            </span>
            <StaffStatusBadge status={member.status} />
          </div>

          <div className="pt-3 flex justify-between items-center">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" aria-hidden="true" /> User ID
            </span>
            <code className="font-mono text-xs text-muted-foreground">{member.userId}</code>
          </div>

          <div className="pt-3 flex justify-between items-center">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> Joined Date
            </span>
            <span className="text-muted-foreground text-xs">{new Date(member.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="outline" onClick={onClose} size="sm">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
