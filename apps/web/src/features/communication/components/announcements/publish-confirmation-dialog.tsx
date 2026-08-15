'use client';

import * as React from 'react';
import { Button } from '@coaching-os/ui';
import { AlertTriangle, Send, X } from 'lucide-react';
import type { AnnouncementDTO } from '../../types/communication-ui.types';

export interface PublishConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  announcement: AnnouncementDTO | null;
  isPublishing: boolean;
}

export function PublishConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  announcement,
  isPublishing,
}: PublishConfirmationDialogProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isPublishing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPublishing, onClose]);

  if (!isOpen || !announcement) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-dialog-title"
    >
      <div className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 id="publish-dialog-title" className="text-lg font-bold text-[hsl(var(--foreground))]">
                Publish Announcement?
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Target: {announcement.targetType === 'institute' ? 'All Institute Members' : `Batch ${announcement.targetBatchId}`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isPublishing}
            className="h-8 w-8 p-0"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>Irreversible Action:</strong> Publishing makes this announcement immediately visible to all targeted recipients and <strong>immutable</strong>. Once published, content cannot be edited or deleted.
          </span>
        </div>

        <div className="space-y-1 text-sm bg-[hsl(var(--muted)/0.3)] p-3 rounded-lg border border-[hsl(var(--border))]">
          <p className="font-semibold text-[hsl(var(--foreground))] line-clamp-1">{announcement.title}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">{announcement.body}</p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPublishing}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onConfirm}
            disabled={isPublishing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPublishing ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Publishing...
              </span>
            ) : (
              'Publish Now'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
