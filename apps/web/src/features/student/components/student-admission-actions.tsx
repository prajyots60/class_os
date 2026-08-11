'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input } from '@coaching-os/ui';
import { AlertCircle, CheckCircle, XCircle, Ban, Loader2, X } from 'lucide-react';
import type { StudentDTO } from '../types/student-ui.types';

export interface StudentAdmissionModalProps {
  isOpen: boolean;
  type: 'admit' | 'reject' | 'cancel' | null;
  student: StudentDTO | null;
  onClose: () => void;
  onConfirm: (admissionDate?: string) => Promise<void>;
  isSubmitting: boolean;
  error?: string | null;
}

export function StudentAdmissionModal({
  isOpen,
  type,
  student,
  onClose,
  onConfirm,
  isSubmitting,
  error,
}: StudentAdmissionModalProps) {
  const [admissionDate, setAdmissionDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setAdmissionDate(new Date().toISOString().split('T')[0]);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !type || !student) return null;

  const title =
    type === 'admit'
      ? 'Admit Pending Student'
      : type === 'reject'
        ? 'Reject Student Admission'
        : 'Cancel Student Admission';

  const description =
    type === 'admit'
      ? `Are you sure you want to admit ${student.displayName} (Adm No: ${student.admissionNumber})? This will transition admission status to Admitted and standing status to Active.`
      : type === 'reject'
        ? `Are you sure you want to reject the admission request for ${student.displayName} (Adm No: ${student.admissionNumber})?`
        : `Are you sure you want to cancel the admission request for ${student.displayName} (Adm No: ${student.admissionNumber})?`;

  const handleConfirm = async () => {
    if (isSubmitting) return;
    if (type === 'admit') {
      await onConfirm(admissionDate);
    } else {
      await onConfirm();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admission-modal-title"
    >
      <div className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center gap-2">
            {type === 'admit' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
            {type === 'reject' && <XCircle className="h-5 w-5 text-rose-600" />}
            {type === 'cancel' && <Ban className="h-5 w-5 text-slate-500" />}
            <h2 id="admission-modal-title" className="text-base font-semibold text-[hsl(var(--foreground))]">
              {title}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting} aria-label="Close modal" className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <div className="p-4 mx-6 mt-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs text-destructive font-medium">{error}</div>
          </div>
        )}

        <div className="p-6 space-y-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{description}</p>

          {type === 'admit' && (
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">
                Admission Date
              </label>
              <Input
                type="date"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isSubmitting}
            variant={type === 'admit' ? 'default' : type === 'reject' ? 'destructive' : 'secondary'}
            className="gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {type === 'admit' ? 'Admit Student' : type === 'reject' ? 'Reject Admission' : 'Cancel Admission'}
          </Button>
        </div>
      </div>
    </div>
  );
}
