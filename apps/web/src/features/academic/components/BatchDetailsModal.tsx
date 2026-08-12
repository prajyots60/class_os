'use client';

import React, { useEffect } from 'react';
import { Button, Badge } from '@coaching-os/ui';
import { X, Users, Calendar, UserCheck, BookOpen, Layers } from 'lucide-react';
import type { BatchDTO, ProgramDTO, SubjectDTO } from '@coaching-os/identity/client';

export interface BatchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: BatchDTO | null;
  subject?: SubjectDTO | null;
  program?: ProgramDTO | null;
}

export function BatchDetailsModal({
  isOpen,
  onClose,
  batch,
  subject,
  program,
}: BatchDetailsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !batch) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-details-title"
    >
      <div className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden my-8 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[hsl(var(--primary))]" />
            <h2 id="batch-details-title" className="text-base font-semibold text-[hsl(var(--foreground))]">
              Batch Details
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal" className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <span className="text-[hsl(var(--muted-foreground))]">Code:</span>
            <span className="ml-2 font-mono font-bold text-[hsl(var(--foreground))]">{batch.code}</span>
          </div>

          <div>
            <span className="text-[hsl(var(--muted-foreground))]">Name:</span>
            <span className="ml-2 font-medium text-[hsl(var(--foreground))]">{batch.name}</span>
          </div>

          <div>
            <span className="text-[hsl(var(--muted-foreground))]">Status:</span>
            <Badge
              variant={batch.status === 'running' || batch.status === 'open' ? 'default' : batch.status === 'archived' ? 'destructive' : 'secondary'}
              className="ml-2 capitalize"
            >
              {batch.status}
            </Badge>
          </div>

          <div className="pt-3 border-t border-[hsl(var(--border))] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-[hsl(var(--primary))]" />
                Subject:
              </span>
              <span className="font-medium text-[hsl(var(--foreground))]">
                {subject ? `${subject.code} - ${subject.name}` : batch.subjectId}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-[hsl(var(--primary))]" />
                Program:
              </span>
              <span className="font-medium text-[hsl(var(--foreground))]">
                {program ? `${program.code} - ${program.name}` : batch.programId ? batch.programId : 'None'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-[hsl(var(--primary))]" />
                Primary Teacher:
              </span>
              <span className="font-medium text-[hsl(var(--foreground))]">
                {batch.teacherId ? `Assigned (${batch.teacherId.slice(0, 8)})` : 'Unassigned'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[hsl(var(--primary))]" />
                Max Capacity:
              </span>
              <span className="font-medium text-[hsl(var(--foreground))]">
                {batch.capacity ? `${batch.capacity} seats` : 'Uncapped'}
              </span>
            </div>

            {(batch.startDate || batch.endDate) && (
              <div className="flex items-center justify-between">
                <span className="text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[hsl(var(--primary))]" />
                  Schedule Dates:
                </span>
                <span className="font-medium text-[hsl(var(--foreground))]">
                  {batch.startDate ? new Date(batch.startDate).toLocaleDateString() : 'N/A'} -{' '}
                  {batch.endDate ? new Date(batch.endDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
