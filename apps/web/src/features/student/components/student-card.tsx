'use client';

import * as React from 'react';
import { Button } from '@coaching-os/ui';
import { Eye, Edit2, CheckCircle, XCircle, Ban, Power, PowerOff, Archive, Phone, Mail } from 'lucide-react';
import { StudentAdmissionStatusBadge, StudentStatusBadge } from './student-status-badge';
import type { StudentDTO } from '../types/student-ui.types';

export interface StudentCardProps {
  student: StudentDTO;
  canUpdate: boolean;
  canArchive: boolean;
  onViewDetails: (student: StudentDTO) => void;
  onEdit: (student: StudentDTO) => void;
  onAdmit: (student: StudentDTO) => void;
  onReject: (student: StudentDTO) => void;
  onCancel: (student: StudentDTO) => void;
  onActivate: (student: StudentDTO) => void;
  onDeactivate: (student: StudentDTO) => void;
  onArchive: (student: StudentDTO) => void;
}

export function StudentCard({
  student,
  canUpdate,
  canArchive,
  onViewDetails,
  onEdit,
  onAdmit,
  onReject,
  onCancel,
  onActivate,
  onDeactivate,
  onArchive,
}: StudentCardProps) {
  const isPending = student.admissionStatus === 'pending';
  const isAdmitted = student.admissionStatus === 'admitted';
  const isActive = student.status === 'active';
  const isInactive = student.status === 'inactive';
  const isArchived = student.status === 'archived';

  return (
    <div
      className="p-4 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-sm space-y-3 md:hidden"
      data-testid={`student-card-${student.id}`}
    >
      {/* Top Bar: Name & Status Badges */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-base text-[hsl(var(--foreground))]">{student.displayName}</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Adm No:{' '}
            <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
              {student.admissionNumber}
            </code>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StudentAdmissionStatusBadge status={student.admissionStatus} />
          <StudentStatusBadge status={student.status} />
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-1 text-xs text-[hsl(var(--muted-foreground))] pt-1 border-t border-[hsl(var(--border))]">
        {student.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
            <span>{student.phone}</span>
          </div>
        )}
        {student.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
            <span>{student.email}</span>
          </div>
        )}
        {student.admissionDate && (
          <p className="text-[11px] pt-0.5 text-[hsl(var(--muted-foreground))]">
            Admitted: {new Date(student.admissionDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-[hsl(var(--border))]">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(student)}
          className="h-8 text-xs gap-1.5"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          View
        </Button>

        {canUpdate && !isArchived && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(student)}
            className="h-8 text-xs gap-1.5"
          >
            <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </Button>
        )}

        {canUpdate && isPending && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAdmit(student)}
              className="h-8 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
            >
              <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Admit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReject(student)}
              className="h-8 text-xs text-rose-600 border-rose-300 hover:bg-rose-50"
            >
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Reject
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(student)}
              className="h-8 text-xs text-slate-600"
            >
              <Ban className="h-3.5 w-3.5" aria-hidden="true" />
              Cancel
            </Button>
          </>
        )}

        {canUpdate && isAdmitted && !isArchived && (
          <>
            {isInactive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onActivate(student)}
                className="h-8 text-xs text-emerald-600 border-emerald-300"
              >
                <Power className="h-3.5 w-3.5" aria-hidden="true" />
                Activate
              </Button>
            )}
            {isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDeactivate(student)}
                className="h-8 text-xs text-amber-600 border-amber-300"
              >
                <PowerOff className="h-3.5 w-3.5" aria-hidden="true" />
                Deactivate
              </Button>
            )}
          </>
        )}

        {canArchive && !isArchived && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onArchive(student)}
            className="h-8 text-xs text-destructive border-destructive/30"
          >
            <Archive className="h-3.5 w-3.5" aria-hidden="true" />
            Archive
          </Button>
        )}
      </div>
    </div>
  );
}
