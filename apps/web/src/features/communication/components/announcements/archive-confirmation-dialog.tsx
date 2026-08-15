'use client';

import * as React from 'react';
import { Button } from '@coaching-os/ui';
import { Archive, X } from 'lucide-react';
import type { AnnouncementDTO } from '../../types/communication-ui.types';

export interface ArchiveConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  announcement: AnnouncementDTO | null;
  isArchiving: boolean;
}

export function ArchiveConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  announcement,
  isArchiving,
}: ArchiveConfirmationDialogProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isArchiving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isArchiving, onClose]);

  if (!isOpen || !announcement) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-dialog-title"
    >
      <div className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-500/10 text-slate-600 flex items-center justify-center">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <h2 id="archive-dialog-title" className="text-lg font-bold text-[hsl(var(--foreground))]">
                Archive Announcement?
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Title: {announcement.title}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isArchiving}
            className="h-8 w-8 p-0"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Archiving moves this published announcement to historical archives. It will remain immutable and read-only.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isArchiving}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onConfirm}
            disabled={isArchiving}
          >
            {isArchiving ? 'Archiving...' : 'Archive Announcement'}
          </Button>
        </div>
      </div>
    </div>
  );
}
