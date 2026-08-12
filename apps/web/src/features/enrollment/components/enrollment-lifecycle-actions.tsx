'use client';

import * as React from 'react';
import { Button } from '@coaching-os/ui';
import { Eye, Power, CheckCircle2, UserX, Ban, ArrowRightLeft, Archive } from 'lucide-react';
import type { EnrichedEnrollmentDTO } from '../types/enrollment-ui.types';

export interface EnrollmentLifecycleActionsProps {
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

export function EnrollmentLifecycleActions({
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
}: EnrollmentLifecycleActionsProps) {
  const { status } = enrollment;
  const isPending = status === 'pending';
  const isActive = status === 'active';
  const isTerminal = ['completed', 'withdrawn', 'transferred', 'cancelled'].includes(status);
  const isArchived = enrollment.deletedAt !== null;

  return (
    <div className="flex items-center justify-end gap-1.5" data-testid={`enrollment-actions-${enrollment.id}`}>
      {/* View Details */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewDetails(enrollment)}
        title="View Details"
        className="h-8 px-2 text-xs gap-1"
        data-testid={`view-details-button-${enrollment.id}`}
      >
        <Eye className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
        View
      </Button>

      {/* Status Transitions */}
      {(canStatus || canUpdate) && !isTerminal && !isArchived && (
        <>
          {isPending && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onActivate(enrollment)}
              title="Activate Enrollment"
              className="h-8 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              data-testid={`activate-button-${enrollment.id}`}
            >
              <Power className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}

          {isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onComplete(enrollment)}
              title="Complete Enrollment"
              className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              data-testid={`complete-button-${enrollment.id}`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}

          {(isPending || isActive) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onWithdraw(enrollment)}
              title="Withdraw Enrollment"
              className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              data-testid={`withdraw-button-${enrollment.id}`}
            >
              <UserX className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}

          {isPending && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(enrollment)}
              title="Cancel Enrollment"
              className="h-8 px-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              data-testid={`cancel-button-${enrollment.id}`}
            >
              <Ban className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </>
      )}

      {/* Transfer Batch Action */}
      {canTransfer && (isPending || isActive) && !isArchived && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTransfer(enrollment)}
          title="Transfer to Another Batch"
          className="h-8 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40"
          data-testid={`transfer-button-${enrollment.id}`}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      )}

      {/* Soft Archive */}
      {canArchive && !isArchived && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onArchive(enrollment)}
          title="Archive Enrollment Record"
          className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
          data-testid={`archive-button-${enrollment.id}`}
        >
          <Archive className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
