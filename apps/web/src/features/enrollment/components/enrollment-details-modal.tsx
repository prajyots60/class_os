'use client';

import React, { useEffect } from 'react';
import { Button } from '@coaching-os/ui';
import { X, User, BookOpen, Calendar, ArrowRightLeft } from 'lucide-react';
import { EnrollmentStatusBadge } from './enrollment-status-badge';
import type { EnrichedEnrollmentDTO } from '../types/enrollment-ui.types';

export interface EnrollmentDetailsModalProps {
  enrollment: EnrichedEnrollmentDTO | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EnrollmentDetailsModal({
  enrollment,
  isOpen,
  onClose,
}: EnrollmentDetailsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !enrollment) return null;

  const studentName = enrollment.student?.displayName || `Student ${enrollment.studentId.slice(0, 8)}`;
  const admissionNo = enrollment.student?.admissionNumber || '—';
  const batchName = enrollment.batch?.name || `Batch ${enrollment.batchId.slice(0, 8)}`;
  const batchCode = enrollment.batch?.code || '';
  const subjectName = enrollment.batch?.subjectName || '—';
  const programName = enrollment.batch?.programName || '—';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enrollment-details-title"
      data-testid="enrollment-details-modal"
    >
      <div className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center gap-3">
            <div>
              <h2 id="enrollment-details-title" className="text-lg font-bold text-[hsl(var(--foreground))]">
                Enrollment Details
              </h2>
              <div className="mt-1">
                <EnrollmentStatusBadge status={enrollment.status} />
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal" className="h-8 w-8 p-0" data-testid="close-details-modal-button">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-sm max-h-[70vh] overflow-y-auto text-[hsl(var(--foreground))]">
          {/* Learner Summary */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" /> Learner Profile
            </h3>
            <div className="grid grid-cols-2 gap-3 bg-[hsl(var(--muted)/0.3)] p-3.5 rounded-lg border border-[hsl(var(--border))] text-xs">
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Student Name:</span>
                <p className="font-semibold text-sm text-[hsl(var(--foreground))]">{studentName}</p>
              </div>
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Admission Number:</span>
                <p className="font-mono font-medium text-[hsl(var(--foreground))]">{admissionNo}</p>
              </div>
            </div>
          </div>

          {/* Batch Context */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Teaching Group
            </h3>
            <div className="grid grid-cols-2 gap-3 bg-[hsl(var(--muted)/0.3)] p-3.5 rounded-lg border border-[hsl(var(--border))] text-xs">
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Batch Name:</span>
                <p className="font-medium text-[hsl(var(--foreground))]">{batchName}</p>
              </div>
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Batch Code:</span>
                <p className="font-mono font-medium text-[hsl(var(--foreground))]">{batchCode || '—'}</p>
              </div>
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Program:</span>
                <p className="font-medium text-[hsl(var(--foreground))]">{programName}</p>
              </div>
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Subject:</span>
                <p className="font-medium text-[hsl(var(--foreground))]">{subjectName}</p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Lifecycle Timestamps
            </h3>
            <div className="grid grid-cols-2 gap-3 bg-[hsl(var(--muted)/0.3)] p-3.5 rounded-lg border border-[hsl(var(--border))] text-xs">
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Enrolled Date:</span>
                <p className="font-medium">
                  {enrollment.enrolledAt ? new Date(enrollment.enrolledAt).toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Record Created:</span>
                <p className="font-medium">
                  {enrollment.createdAt ? new Date(enrollment.createdAt).toLocaleString() : '—'}
                </p>
              </div>

              {enrollment.completedAt && (
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">Completed Date:</span>
                  <p className="font-medium text-blue-600 dark:text-blue-400">
                    {new Date(enrollment.completedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {enrollment.withdrawnAt && (
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">Withdrawn Date:</span>
                  <p className="font-medium text-rose-600 dark:text-rose-400">
                    {new Date(enrollment.withdrawnAt).toLocaleString()}
                  </p>
                </div>
              )}

              {enrollment.transferredAt && (
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">Transferred Date:</span>
                  <p className="font-medium text-purple-600 dark:text-purple-400">
                    {new Date(enrollment.transferredAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Transfer History Summary */}
          {enrollment.status === 'transferred' && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3.5 dark:bg-purple-950/40 dark:border-purple-800 space-y-1 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2">
              <ArrowRightLeft className="h-4 w-4 shrink-0 text-purple-600 mt-0.5" />
              <div>
                <span className="font-semibold">Transfer Lineage Preserved:</span>
                <p>
                  This enrollment record was transferred. Source aggregate remains frozen in transferred status to preserve full historical audit logs.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Details
          </Button>
        </div>
      </div>
    </div>
  );
}
