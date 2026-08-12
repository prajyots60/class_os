'use client';

import React, { useEffect } from 'react';
import { Button, Badge } from '@coaching-os/ui';
import { X, BookOpen, Layers } from 'lucide-react';
import type { ProgramDTO, SubjectDTO } from '@coaching-os/identity/client';

export interface ProgramDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: ProgramDTO | null;
  mappedSubjects?: SubjectDTO[];
}

export function ProgramDetailsModal({
  isOpen,
  onClose,
  program,
  mappedSubjects = [],
}: ProgramDetailsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !program) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="program-details-title"
    >
      <div className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden my-8 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[hsl(var(--primary))]" />
            <h2 id="program-details-title" className="text-base font-semibold text-[hsl(var(--foreground))]">
              Program Details
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal" className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <span className="text-[hsl(var(--muted-foreground))]">Code:</span>
            <span className="ml-2 font-mono font-bold text-[hsl(var(--foreground))]">{program.code}</span>
          </div>

          <div>
            <span className="text-[hsl(var(--muted-foreground))]">Name:</span>
            <span className="ml-2 font-medium text-[hsl(var(--foreground))]">{program.name}</span>
          </div>

          <div>
            <span className="text-[hsl(var(--muted-foreground))]">Status:</span>
            <Badge
              variant={program.status === 'active' ? 'default' : program.status === 'archived' ? 'destructive' : 'secondary'}
              className="ml-2 capitalize"
            >
              {program.status}
            </Badge>
          </div>

          {program.description && (
            <div>
              <span className="text-[hsl(var(--muted-foreground))] block mb-1">Description:</span>
              <p className="p-2.5 rounded-lg bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--foreground))]">
                {program.description}
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-[hsl(var(--border))]">
            <div className="flex items-center gap-1.5 font-medium text-[hsl(var(--foreground))] mb-2">
              <Layers className="h-4 w-4 text-[hsl(var(--primary))]" />
              Mapped Subjects ({mappedSubjects.length})
            </div>
            {mappedSubjects.length === 0 ? (
              <p className="text-xs text-[hsl(var(--muted-foreground))] italic">No subjects mapped to this program yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {mappedSubjects.map((sub) => (
                  <Badge key={sub.id} variant="outline" className="font-mono text-xs">
                    {sub.code} - {sub.name}
                  </Badge>
                ))}
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
