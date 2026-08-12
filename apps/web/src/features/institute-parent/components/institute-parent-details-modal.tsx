'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '@coaching-os/ui';
import { X, Phone, ShieldCheck, Calendar, FileText, Building2, GraduationCap } from 'lucide-react';
import { InstituteParentStatusBadge } from './institute-parent-status-badge';
import type { InstituteParentDTO } from '../types/institute-parent-ui.types';
import { listParentStudents, GUARDIAN_RELATIONSHIP_LABELS, GuardianPrimaryBadge } from '../../guardian';
import type { InstituteParentStudentDTO } from '../../guardian';

export interface InstituteParentDetailsModalProps {
  parent: InstituteParentDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (parent: InstituteParentDTO) => void;
  canUpdate?: boolean;
}

export function InstituteParentDetailsModal({
  parent,
  isOpen,
  onClose,
  onEdit,
  canUpdate = false,
}: InstituteParentDetailsModalProps) {
  const [linkedStudents, setLinkedStudents] = useState<InstituteParentStudentDTO[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && parent?.id) {
      Promise.resolve().then(() => setIsLoadingStudents(true));
      listParentStudents(parent.id)
        .then((res) => {
          if (res.data) {
            setLinkedStudents(res.data.filter((item) => item.status !== 'archived'));
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoadingStudents(false);
        });
    }
  }, [isOpen, parent?.id]);

  if (!isOpen || !parent) return null;

  const identity = parent.parentIdentity;
  const displayName = identity?.name || 'Unnamed Parent';
  const phone = identity?.phone || '—';
  const globalStatus = identity?.status || 'active';
  const createdAtFormatted = parent.createdAt ? new Date(parent.createdAt).toLocaleDateString() : '—';
  const updatedAtFormatted = parent.updatedAt ? new Date(parent.updatedAt).toLocaleDateString() : '—';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="parent-details-title"
      data-testid="parent-details-modal"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] bg-white shadow-xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[hsl(var(--border))]">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white font-bold text-lg">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 id="parent-details-title" className="text-lg font-bold text-[hsl(var(--foreground))] truncate">
                {displayName}
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center mt-0.5">
                <Phone className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                <span className="font-mono text-xs">{phone}</span>
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full border-[hsl(var(--border))]"
            aria-label="Close dialog"
            data-testid="close-details-btn"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Section 1: Global ParentIdentity Platform Information */}
        <Card className="p-4 border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              <ShieldCheck className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
              <span>Global CoachingOS Identity</span>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-wider font-semibold border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
            >
              Platform Status: {globalStatus}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[hsl(var(--muted-foreground))] block text-[11px]">Identity ID</span>
              <span className="font-mono text-[11px] text-[hsl(var(--foreground))] truncate block">
                {parent.parentIdentityId}
              </span>
            </div>
            <div>
              <span className="text-[hsl(var(--muted-foreground))] block text-[11px]">Registered Phone</span>
              <span className="font-mono text-[11px] text-[hsl(var(--foreground))] block">{phone}</span>
            </div>
          </div>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] italic">
            Global identity details (phone & platform standing) are managed centrally across CoachingOS and cannot be mutated by local tenant CRM actions.
          </p>
        </Card>

        {/* Section 2: Tenant Institute CRM Information */}
        <Card className="p-4 border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))]">
              <Building2 className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
              <span>Institute CRM Record</span>
            </div>
            <InstituteParentStatusBadge status={parent.status} />
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] flex items-center mb-1">
                <FileText className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Staff Operational Notes
              </span>
              <div className="p-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--foreground))] text-xs min-h-[60px] whitespace-pre-wrap">
                {parent.notes || <span className="text-[hsl(var(--muted-foreground)/0.6)] italic">No staff notes recorded yet for this institute.</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] text-[hsl(var(--muted-foreground))]">
              <div className="flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1.5 shrink-0" aria-hidden="true" />
                <span>Linked: {createdAtFormatted}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1.5 shrink-0" aria-hidden="true" />
                <span>Updated: {updatedAtFormatted}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Section 3: Linked Students */}
        <Card className="p-4 border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3 shadow-sm" data-testid="parent-linked-students-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))]">
              <GraduationCap className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
              <span>Linked Students ({linkedStudents.length})</span>
            </div>
          </div>

          {isLoadingStudents ? (
            <p className="text-xs text-[hsl(var(--muted-foreground))] italic">Loading linked students...</p>
          ) : linkedStudents.length === 0 ? (
            <p className="text-xs text-[hsl(var(--muted-foreground))] italic">No active students linked to this parent record.</p>
          ) : (
            <div className="space-y-2">
              {linkedStudents.map((rel) => {
                const relLabel = GUARDIAN_RELATIONSHIP_LABELS[rel.relationshipType] || rel.relationshipType;
                const studentName = (rel as unknown as { studentName?: string }).studentName || `Student Record (${rel.studentId.substring(0, 8)})`;
                const admNumber = (rel as unknown as { admissionNumber?: string }).admissionNumber;

                return (
                  <div
                    key={rel.id}
                    className="p-2.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] flex items-center justify-between text-xs"
                    data-testid={`parent-linked-student-item-${rel.id}`}
                  >
                    <div>
                      <div className="font-semibold text-[hsl(var(--foreground))]">{studentName}</div>
                      {admNumber && <div className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">{admNumber}</div>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-medium text-primary uppercase">{relLabel}</span>
                      <GuardianPrimaryBadge isPrimary={rel.isPrimary} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2 border-t border-[hsl(var(--border))]">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-[hsl(var(--border))]"
          >
            Close
          </Button>

          {canUpdate && onEdit && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(parent);
              }}
              className="bg-[hsl(var(--primary))] text-white hover:opacity-90"
              data-testid="edit-from-details-btn"
            >
              Edit CRM Record
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
