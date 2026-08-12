'use client';

import * as React from 'react';
import { EnrollmentStatusBadge } from './enrollment-status-badge';
import { EnrollmentLifecycleActions } from './enrollment-lifecycle-actions';
import type { EnrichedEnrollmentDTO } from '../types/enrollment-ui.types';

export interface EnrollmentCardProps {
  enrollment: EnrichedEnrollmentDTO;
  canUpdate: boolean;
  canStatus: boolean;
  canTransfer: boolean;
  canArchive: boolean;
  onViewDetails: (enrollment: EnrichedEnrollmentDTO) => void;
  onActivate: (enrollment: EnrichedEnrollmentDTO) => void;
  onComplete: (enrollment: EnrichedEnrollmentDTO) => void;
  onWithdraw: (enrollment: EnrichedEnrollmentDTO) => void;
  onCancel: (enrollment: EnrichedEnrollmentDTO) => void;
  onTransfer: (enrollment: EnrichedEnrollmentDTO) => void;
  onArchive: (enrollment: EnrichedEnrollmentDTO) => void;
}

export function EnrollmentCard({
  enrollment,
  canUpdate,
  canStatus,
  canTransfer,
  canArchive,
  onViewDetails,
  onActivate,
  onComplete,
  onWithdraw,
  onCancel,
  onTransfer,
  onArchive,
}: EnrollmentCardProps) {
  const studentName = enrollment.student?.displayName || `Student ${enrollment.studentId.slice(0, 8)}`;
  const admissionNo = enrollment.student?.admissionNumber || '—';
  const batchName = enrollment.batch?.name || `Batch ${enrollment.batchId.slice(0, 8)}`;
  const batchCode = enrollment.batch?.code || '';

  return (
    <div
      className="md:hidden border border-[hsl(var(--border))] rounded-xl p-4 bg-[hsl(var(--card))] shadow-sm space-y-3"
      data-testid={`enrollment-card-${enrollment.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-base text-[hsl(var(--foreground))]">{studentName}</h3>
          <p className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
            Admission No: {admissionNo}
          </p>
        </div>
        <EnrollmentStatusBadge status={enrollment.status} />
      </div>

      <div className="text-xs space-y-1 text-[hsl(var(--muted-foreground))] border-t border-b border-[hsl(var(--border))] py-2">
        <div className="flex justify-between">
          <span className="font-medium text-[hsl(var(--foreground))]">Batch:</span>
          <span>
            {batchName} {batchCode && `(${batchCode})`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium text-[hsl(var(--foreground))]">Enrolled:</span>
          <span>{enrollment.enrolledAt ? new Date(enrollment.enrolledAt).toLocaleDateString() : '—'}</span>
        </div>
        {enrollment.status === 'transferred' && (
          <div className="text-purple-600 dark:text-purple-400 font-medium text-[11px] pt-1">
            Transferred to new batch
          </div>
        )}
      </div>

      <div className="pt-1 flex justify-end">
        <EnrollmentLifecycleActions
          enrollment={enrollment}
          canUpdate={canUpdate}
          canStatus={canStatus}
          canTransfer={canTransfer}
          canArchive={canArchive}
          onViewDetails={onViewDetails}
          onActivate={onActivate}
          onComplete={onComplete}
          onWithdraw={onWithdraw}
          onCancel={onCancel}
          onTransfer={onTransfer}
          onArchive={onArchive}
        />
      </div>
    </div>
  );
}
