'use client';

import * as React from 'react';
import { EnrollmentStatusBadge } from './enrollment-status-badge';
import { EnrollmentLifecycleActions } from './enrollment-lifecycle-actions';
import type { EnrichedEnrollmentDTO } from '../types/enrollment-ui.types';

export interface EnrollmentTableProps {
  enrollments: EnrichedEnrollmentDTO[];
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

export function EnrollmentTable({
  enrollments,
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
}: EnrollmentTableProps) {
  return (
    <div
      className="hidden md:block overflow-x-auto border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-sm"
      data-testid="enrollment-table"
    >
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))] font-semibold text-xs uppercase tracking-wider">
            <th scope="col" className="py-3.5 px-4">
              Student
            </th>
            <th scope="col" className="py-3.5 px-4">
              Batch
            </th>
            <th scope="col" className="py-3.5 px-4">
              Academic Context
            </th>
            <th scope="col" className="py-3.5 px-4">
              Status
            </th>
            <th scope="col" className="py-3.5 px-4">
              Enrolled Date
            </th>
            <th scope="col" className="py-3.5 px-4 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[hsl(var(--border))] text-[hsl(var(--foreground))]">
          {enrollments.map((enrollment) => {
            const studentName = enrollment.student?.displayName || `Student ${enrollment.studentId.slice(0, 8)}`;
            const admissionNo = enrollment.student?.admissionNumber || '—';
            const batchName = enrollment.batch?.name || `Batch ${enrollment.batchId.slice(0, 8)}`;
            const batchCode = enrollment.batch?.code || '';
            const subjectName = enrollment.batch?.subjectName || '';
            const programName = enrollment.batch?.programName || '';

            return (
              <tr
                key={enrollment.id}
                className="hover:bg-[hsl(var(--muted)/0.3)] transition-colors group"
                data-testid={`enrollment-row-${enrollment.id}`}
              >
                {/* Student */}
                <td className="py-3.5 px-4 font-medium">
                  <div className="flex flex-col">
                    <span className="font-semibold text-[hsl(var(--foreground))]">{studentName}</span>
                    <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
                      No: {admissionNo}
                    </span>
                  </div>
                </td>

                {/* Batch */}
                <td className="py-3.5 px-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-[hsl(var(--foreground))]">{batchName}</span>
                    {batchCode && (
                      <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
                        Code: {batchCode}
                      </span>
                    )}
                  </div>
                </td>

                {/* Academic Context (Subject / Program) */}
                <td className="py-3.5 px-4 text-xs text-[hsl(var(--muted-foreground))]">
                  <div>{programName || 'Standard Program'}</div>
                  {subjectName && <div className="text-[11px] text-[hsl(var(--muted-foreground))/0.8]">{subjectName}</div>}
                </td>

                {/* Status Badge */}
                <td className="py-3.5 px-4">
                  <EnrollmentStatusBadge status={enrollment.status} />
                  {enrollment.status === 'transferred' && enrollment.transferredToBatchId && (
                    <div className="mt-1 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                      Transferred to new batch
                    </div>
                  )}
                </td>

                {/* Enrolled Date */}
                <td className="py-3.5 px-4 text-xs text-[hsl(var(--muted-foreground))]">
                  {enrollment.enrolledAt ? new Date(enrollment.enrolledAt).toLocaleDateString() : '—'}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right">
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
