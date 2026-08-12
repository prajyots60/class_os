'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input } from '@coaching-os/ui';
import { X, Loader2, AlertCircle } from 'lucide-react';
import type { ProgramDTO } from '@coaching-os/identity/client';
import type { CreateProgramFormValues, EditProgramFormValues } from '../types/academic-ui.types';

export interface ProgramFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CreateProgramFormValues | EditProgramFormValues) => Promise<void>;
  program?: ProgramDTO | null;
  isSubmitting: boolean;
  serverError?: string | null;
}

export function ProgramFormModal({
  isOpen,
  onClose,
  onSubmit,
  program,
  isSubmitting,
  serverError,
}: ProgramFormModalProps) {
  const isEditMode = !!program;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [prevProgram, setPrevProgram] = useState<ProgramDTO | null | undefined>(undefined);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(false);

  if (program !== prevProgram || isOpen !== prevIsOpen) {
    setPrevProgram(program);
    setPrevIsOpen(isOpen);
    if (program) {
      setCode(program.code);
      setName(program.name);
      setDescription(program.description || '');
    } else {
      setCode('');
      setName('');
      setDescription('');
    }
    setFieldErrors({});
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!isEditMode && !code.trim()) {
      errors.code = 'Program code is required.';
    } else if (!isEditMode && code.trim().length < 2) {
      errors.code = 'Program code must be at least 2 characters.';
    }

    if (!name.trim()) {
      errors.name = 'Program name is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateForm()) return;

    const values: CreateProgramFormValues | EditProgramFormValues = isEditMode
      ? {
          name: name.trim(),
          description: description.trim() || undefined,
        }
      : {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
        };

    await onSubmit(values);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="program-modal-title"
    >
      <div className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <h2 id="program-modal-title" className="text-lg font-semibold text-[hsl(var(--foreground))]">
            {isEditMode ? 'Edit Program' : 'Create Program'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {serverError && (
          <div className="p-4 mx-6 mt-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs text-destructive font-medium">{serverError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">
              Program Code <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isEditMode || isSubmitting}
              placeholder="e.g. JEE-2026"
              aria-invalid={!!fieldErrors.code}
              aria-describedby={fieldErrors.code ? 'program-code-error' : undefined}
              className={fieldErrors.code ? 'border-destructive' : ''}
              data-testid="program-code-input"
            />
            {isEditMode && (
              <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                Program code is immutable once created.
              </p>
            )}
            {fieldErrors.code && (
              <p id="program-code-error" className="mt-1 text-xs text-destructive">
                {fieldErrors.code}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">
              Program Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Joint Entrance Examination Advanced"
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? 'program-name-error' : undefined}
              className={fieldErrors.name ? 'border-destructive' : ''}
              data-testid="program-name-input"
            />
            {fieldErrors.name && (
              <p id="program-name-error" className="mt-1 text-xs text-destructive">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              placeholder="Program overview and objectives..."
              className="w-full px-3 py-2 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="program-form-submit-button" className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? 'Save Changes' : 'Create Program'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
