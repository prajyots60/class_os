'use client';

import * as React from 'react';
import { Button, Badge } from '@coaching-os/ui';
import { X, Paperclip, Calendar, BookOpen, ExternalLink } from 'lucide-react';
import type { ParentHomeworkItemDTO } from '../../types/parent-ui.types';

interface HomeworkDetailModalProps {
  homework: ParentHomeworkItemDTO | null;
  onClose: () => void;
}

export function HomeworkDetailModal({ homework, onClose }: HomeworkDetailModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!homework) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const closeBtn = modalRef.current?.querySelector<HTMLElement>('button');
    closeBtn?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [homework, onClose]);

  if (!homework) return null;

  const publishedDateFormatted = homework.publishedAt
    ? new Date(homework.publishedAt).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Draft';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="homework-modal-title"
    >
      <div ref={modalRef} className="w-full max-w-lg rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[hsl(var(--border))] pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="secondary" className="text-[10px]">
                {homework.batchName}
              </Badge>
              {homework.subject && (
                <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1 font-medium">
                  <BookOpen className="h-3 w-3" aria-hidden="true" />
                  {homework.subject}
                </span>
              )}
            </div>
            <h2 id="homework-modal-title" className="text-lg font-bold text-[hsl(var(--foreground))]">
              {homework.title}
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1 mt-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              Published on {publishedDateFormatted}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            aria-label="Close homework details modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="space-y-3 py-2 text-sm text-[hsl(var(--foreground))] max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
              Homework Instructions
            </h3>
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-3 text-xs leading-relaxed whitespace-pre-wrap">
              {homework.description || 'No detailed instructions provided.'}
            </div>
          </div>

          {homework.attachmentUrl && (
            <div className="pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
                Attachment / Reference Link
              </h3>
              <a
                href={homework.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.1)] px-4 py-2.5 text-xs font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.2)] transition-colors min-h-[44px]"
              >
                <Paperclip className="h-4 w-4" aria-hidden="true" />
                <span>Open Attachment Resource</span>
                <ExternalLink className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-[hsl(var(--border))]">
          <Button
            variant="outline"
            onClick={onClose}
            className="min-h-[44px] px-5"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
