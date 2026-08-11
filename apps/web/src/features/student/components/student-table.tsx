'use client';

import * as React from 'react';
import { Button } from '@coaching-os/ui';
import { Eye, Edit2, CheckCircle, XCircle, Ban, Power, PowerOff, Archive } from 'lucide-react';
import { StudentAdmissionStatusBadge, StudentStatusBadge } from './student-status-badge';
import type { StudentDTO } from '../types/student-ui.types';

export interface StudentTableProps {
  students: StudentDTO[];
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

export function StudentTable({
  students,
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
}: StudentTableProps) {
  return (
    <div className="hidden md:block overflow-x-auto border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-sm" data-testid="student-table">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))] font-semibold text-xs uppercase tracking-wider">
            <th scope="col" className="py-3.5 px-4">
              Student
            </th>
            <th scope="col" className="py-3.5 px-4">
              Admission No.
            </th>
            <th scope="col" className="py-3.5 px-4">
              Contact
            </th>
            <th scope="col" className="py-3.5 px-4">
              Admission Status
            </th>
            <th scope="col" className="py-3.5 px-4">
              Standing
            </th>
            <th scope="col" className="py-3.5 px-4">
              Admission Date
            </th>
            <th scope="col" className="py-3.5 px-4 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[hsl(var(--border))] text-[hsl(var(--foreground))]">
          {students.map((student) => {
            const isPending = student.admissionStatus === 'pending';
            const isAdmitted = student.admissionStatus === 'admitted';
            const isActive = student.status === 'active';
            const isInactive = student.status === 'inactive';
            const isArchived = student.status === 'archived';

            return (
              <tr
                key={student.id}
                className="hover:bg-[hsl(var(--muted)/0.3)] transition-colors group"
                data-testid={`student-row-${student.id}`}
              >
                {/* Name & Email */}
                <td className="py-3.5 px-4 font-medium">
                  <div className="flex flex-col">
                    <span className="font-semibold text-[hsl(var(--foreground))]">{student.displayName}</span>
                    {student.email ? (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">{student.email}</span>
                    ) : (
                      <span className="text-xs text-[hsl(var(--muted-foreground))] italic">No email provided</span>
                    )}
                  </div>
                </td>

                {/* Admission Number */}
                <td className="py-3.5 px-4">
                  <code className="font-mono text-xs px-2 py-0.5 rounded bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
                    {student.admissionNumber}
                  </code>
                </td>

                {/* Contact (Phone) */}
                <td className="py-3.5 px-4 text-xs text-[hsl(var(--muted-foreground))]">
                  {student.phone || '—'}
                </td>

                {/* Admission Status Badge */}
                <td className="py-3.5 px-4">
                  <StudentAdmissionStatusBadge status={student.admissionStatus} />
                </td>

                {/* Standing Status Badge */}
                <td className="py-3.5 px-4">
                  <StudentStatusBadge status={student.status} />
                </td>

                {/* Admission Date */}
                <td className="py-3.5 px-4 text-xs text-[hsl(var(--muted-foreground))]">
                  {student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '—'}
                </td>

                {/* Action Controls */}
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* View Details */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(student)}
                      title="View Student Details"
                      className="h-8 px-2.5 text-xs gap-1"
                    >
                      <Eye className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
                      View
                    </Button>

                    {/* Edit Profile */}
                    {canUpdate && !isArchived && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(student)}
                        title="Edit Student Profile"
                        className="h-8 px-2 text-xs"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
                      </Button>
                    )}

                    {/* Admission State Transitions (Pending) */}
                    {canUpdate && isPending && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAdmit(student)}
                          title="Admit Student"
                          className="h-8 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        >
                          <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onReject(student)}
                          title="Reject Admission"
                          className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCancel(student)}
                          title="Cancel Admission"
                          className="h-8 px-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                        >
                          <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </>
                    )}

                    {/* Standing Lifecycle Transitions (Admitted) */}
                    {canUpdate && isAdmitted && !isArchived && (
                      <>
                        {isInactive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onActivate(student)}
                            title="Activate Student Standing"
                            className="h-8 px-2 text-xs text-emerald-600 hover:bg-emerald-50"
                          >
                            <Power className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        )}
                        {isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeactivate(student)}
                            title="Deactivate Student Standing"
                            className="h-8 px-2 text-xs text-amber-600 hover:bg-amber-50"
                          >
                            <PowerOff className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        )}
                      </>
                    )}

                    {/* Soft Archive */}
                    {canArchive && !isArchived && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onArchive(student)}
                        title="Archive Student Record"
                        className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
