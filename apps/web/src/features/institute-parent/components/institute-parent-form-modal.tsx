'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Textarea, Label, Alert, AlertTitle, AlertDescription } from '@coaching-os/ui';
import { X, UserPlus, Edit2, Phone, FileText, AlertCircle } from 'lucide-react';
import type { InstituteParentDTO, CreateParentFormValues, EditParentFormValues } from '../types/institute-parent-ui.types';

export interface InstituteParentFormModalProps {
  mode: 'create' | 'edit';
  parent?: InstituteParentDTO | null;
  isOpen: boolean;
  isSubmitting: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmitCreate: (values: CreateParentFormValues) => Promise<boolean>;
  onSubmitEdit: (id: string, values: EditParentFormValues) => Promise<boolean>;
}

/**
 * InstituteParentFormModal — accessible dialog for adding new parents or editing CRM notes/status.
 */
export function InstituteParentFormModal({
  mode,
  parent,
  isOpen,
  isSubmitting,
  error,
  onClose,
  onSubmitCreate,
  onSubmitEdit,
}: InstituteParentFormModalProps) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  // Sync form state during render when modal opens or target parent changes (prevents cascading render warning)
  const [prevResetKey, setPrevResetKey] = useState({
    isOpen: false,
    parentId: undefined as string | undefined,
    mode,
  });

  const currentParentId = parent?.id;
  if (
    prevResetKey.isOpen !== isOpen ||
    prevResetKey.parentId !== currentParentId ||
    prevResetKey.mode !== mode
  ) {
    setPrevResetKey({ isOpen, parentId: currentParentId, mode });
    if (isOpen) {
      setLocalError(null);
      setFieldErrors({});
      if (mode === 'edit' && parent) {
        setNotes(parent.notes || '');
        setStatus(parent.status);
      } else {
        setPhone('');
        setName('');
        setNotes('');
        setStatus('active');
      }
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setFieldErrors({});

    if (mode === 'create') {
      // Basic validation for phone number
      const trimmedPhone = phone.trim();
      if (!trimmedPhone) {
        setFieldErrors({ phone: 'Phone number is required.' });
        return;
      }

      // Check basic phone length / characters
      if (trimmedPhone.replace(/\D/g, '').length < 8) {
        setFieldErrors({ phone: 'Please enter a valid phone number (minimum 8 digits).' });
        return;
      }

      const success = await onSubmitCreate({
        phone: trimmedPhone,
        name: name.trim() || undefined,
        notes: notes.trim() || undefined,
        initialStatus: status,
      });

      if (success) {
        onClose();
      }
    } else if (mode === 'edit' && parent) {
      const success = await onSubmitEdit(parent.id, {
        notes: notes.trim() || undefined,
        status,
      });

      if (success) {
        onClose();
      }
    }
  };

  const activeError = error || localError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="parent-form-title"
      data-testid={mode === 'create' ? 'add-parent-modal' : 'edit-parent-modal'}
    >
      <div className="relative w-full max-w-md rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] bg-white shadow-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
          <div className="flex items-center space-x-2">
            {mode === 'create' ? (
              <UserPlus className="h-5 w-5 text-[hsl(var(--primary))]" aria-hidden="true" />
            ) : (
              <Edit2 className="h-5 w-5 text-[hsl(var(--primary))]" aria-hidden="true" />
            )}
            <h3 id="parent-form-title" className="text-base font-bold text-[hsl(var(--foreground))]">
              {mode === 'create' ? 'Add Parent Record' : 'Edit Parent CRM Record'}
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-8 w-8 p-0 rounded-full border-[hsl(var(--border))]"
            aria-label="Close form dialog"
            data-testid="close-form-btn"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Error Alert */}
        {activeError && (
          <Alert variant="destructive" className="py-2 px-3 text-xs" data-testid="form-error-alert">
            <AlertCircle className="h-4 w-4 mr-2 shrink-0" aria-hidden="true" />
            <div>
              <AlertTitle className="text-xs font-semibold">Error</AlertTitle>
              <AlertDescription className="text-xs">{activeError}</AlertDescription>
            </div>
          </Alert>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'create' && (
            <>
              {/* Phone Number Field */}
              <div className="space-y-1.5">
                <Label htmlFor="parent-phone" className="text-xs font-semibold text-[hsl(var(--foreground))] flex items-center">
                  <Phone className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Phone Number <span className="text-[hsl(var(--destructive))] ml-0.5">*</span>
                </Label>
                <Input
                  id="parent-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  disabled={isSubmitting}
                  aria-invalid={!!fieldErrors.phone}
                  aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
                  className="h-9 text-xs font-mono"
                  data-testid="parent-phone-input"
                />
                {fieldErrors.phone && (
                  <p id="phone-error" className="text-[11px] text-[hsl(var(--destructive))]">
                    {fieldErrors.phone}
                  </p>
                )}
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  Enter the canonical E.164 phone number. If a global identity exists for this phone, it will be automatically linked.
                </p>
              </div>

              {/* Name Field (Optional for new identity) */}
              <div className="space-y-1.5">
                <Label htmlFor="parent-name" className="text-xs font-semibold text-[hsl(var(--foreground))]">
                  Full Name <span className="text-[hsl(var(--muted-foreground))] font-normal">(Optional)</span>
                </Label>
                <Input
                  id="parent-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  disabled={isSubmitting}
                  className="h-9 text-xs"
                  data-testid="parent-name-input"
                />
              </div>
            </>
          )}

          {mode === 'edit' && parent?.parentIdentity && (
            <div className="p-3 rounded-md bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Parent Identity</span>
              <p className="font-semibold text-xs text-[hsl(var(--foreground))]">
                {parent.parentIdentity.name || 'Unnamed Parent'}
              </p>
              <p className="font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                {parent.parentIdentity.phone}
              </p>
            </div>
          )}

          {/* Status Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="parent-status" className="text-xs font-semibold text-[hsl(var(--foreground))]">
              Institute Standing
            </Label>
            <select
              id="parent-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              disabled={isSubmitting}
              className="w-full h-9 px-3 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              data-testid="parent-status-select"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Notes Field */}
          <div className="space-y-1.5">
            <Label htmlFor="parent-notes" className="text-xs font-semibold text-[hsl(var(--foreground))] flex items-center">
              <FileText className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Staff Internal Notes <span className="text-[hsl(var(--muted-foreground))] font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="parent-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Preferred contact window: 6 PM - 8 PM. Student: Aarav Sharma."
              disabled={isSubmitting}
              rows={3}
              className="text-xs"
              data-testid="parent-notes-input"
            />
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
              Notes remain private and tenant-scoped to this institute only.
            </p>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[hsl(var(--border))]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-[hsl(var(--border))]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSubmitting}
              className="bg-[hsl(var(--primary))] text-white hover:opacity-90"
              data-testid="submit-parent-btn"
            >
              {isSubmitting
                ? mode === 'create'
                  ? 'Adding Parent...'
                  : 'Updating...'
                : mode === 'create'
                ? 'Add Parent'
                : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
