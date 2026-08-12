'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@coaching-os/ui';
import { X, UserCheck, Loader2 } from 'lucide-react';
import {
  GUARDIAN_RELATIONSHIP_LABELS,
  type GuardianRelationshipType,
  type StudentGuardianSummaryDTO,
} from '../types/guardian-ui.types';

export interface EditGuardianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (relationshipType: GuardianRelationshipType) => Promise<void>;
  guardian: StudentGuardianSummaryDTO | null;
  isSubmitting?: boolean;
}

export function EditGuardianModal({
  isOpen,
  onClose,
  onSubmit,
  guardian,
  isSubmitting = false,
}: EditGuardianModalProps) {
  const [relationshipType, setRelationshipType] = useState<GuardianRelationshipType>(
    guardian?.relationshipType || 'mother'
  );
  const [error, setError] = useState<string | null>(null);

  const [prevGuardianId, setPrevGuardianId] = useState<string | undefined>(guardian?.id);
  if (guardian && guardian.id !== prevGuardianId) {
    setPrevGuardianId(guardian.id);
    if (guardian.relationshipType) {
      setRelationshipType(guardian.relationshipType);
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
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen || !guardian) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit(relationshipType);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update relationship type.');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-guardian-title"
      data-testid="edit-guardian-modal"
    >
      <div className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 id="edit-guardian-title" className="text-base font-bold text-[hsl(var(--foreground))]">
              Edit Relationship Type
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {error && (
            <div
              role="alert"
              className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-600 rounded-md"
              data-testid="edit-guardian-error"
            >
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">
              Guardian Name
            </label>
            <p className="font-medium text-base text-[hsl(var(--foreground))]">
              {guardian.parentName || 'Parent / Guardian'}
            </p>
          </div>

          <div>
            <label
              htmlFor="edit-relationship-type-select"
              className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5"
            >
              Relationship Type <span className="text-red-500">*</span>
            </label>
            <select
              id="edit-relationship-type-select"
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as GuardianRelationshipType)}
              disabled={isSubmitting}
              className="w-full h-10 px-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              data-testid="edit-relationship-type-select"
              required
            >
              {Object.entries(GUARDIAN_RELATIONSHIP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[hsl(var(--border))]">
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
              className="bg-primary text-primary-foreground hover:opacity-90 font-semibold gap-1.5"
              data-testid="save-edit-guardian-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
