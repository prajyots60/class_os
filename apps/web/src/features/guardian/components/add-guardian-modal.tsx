'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@coaching-os/ui';
import { X, UserPlus, Search, Loader2, Check } from 'lucide-react';
import { fetchParentsList } from '../../institute-parent/api/institute-parent-api';
import type { InstituteParentDTO } from '../../institute-parent/types/institute-parent-ui.types';
import {
  GUARDIAN_RELATIONSHIP_LABELS,
  type GuardianRelationshipType,
  type CreateGuardianFormValues,
} from '../types/guardian-ui.types';

export interface AddGuardianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CreateGuardianFormValues) => Promise<void>;
  existingPrimaryGuardianName?: string | null;
  isSubmitting?: boolean;
}

export function AddGuardianModal({
  isOpen,
  onClose,
  onSubmit,
  existingPrimaryGuardianName,
  isSubmitting = false,
}: AddGuardianModalProps) {
  const [parents, setParents] = useState<InstituteParentDTO[]>([]);
  const [isLoadingParents, setIsLoadingParents] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [relationshipType, setRelationshipType] = useState<GuardianRelationshipType>('mother');
  const [isPrimary, setIsPrimary] = useState(false);
  const [showPrimaryWarning, setShowPrimaryWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      Promise.resolve().then(() => {
        setError(null);
        setIsLoadingParents(true);
      });
      fetchParentsList({ limit: 50, status: 'active' })
        .then((res) => {
          if (res.data) {
            setParents(res.data);
            if (res.data.length > 0) {
              setSelectedParentId((prev) => prev || res.data[0].id);
            }
          }
        })
        .catch(() => {
          setError('Failed to load parent CRM records.');
        })
        .finally(() => {
          setIsLoadingParents(false);
        });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen) return null;

  const filteredParents = parents.filter((p) => {
    const name = p.parentIdentity?.name || '';
    const phone = p.parentIdentity?.phone || '';
    const query = parentSearch.toLowerCase().trim();
    return name.toLowerCase().includes(query) || phone.includes(query);
  });

  const selectedParent = parents.find((p) => p.id === selectedParentId);

  const handleTogglePrimary = (checked: boolean) => {
    setIsPrimary(checked);
    if (checked && existingPrimaryGuardianName) {
      setShowPrimaryWarning(true);
    } else {
      setShowPrimaryWarning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentId) {
      setError('Please select a parent record.');
      return;
    }

    setError(null);
    try {
      await onSubmit({
        instituteParentId: selectedParentId,
        relationshipType,
        isPrimary,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to add guardian relationship.');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-guardian-title"
      data-testid="add-guardian-modal"
    >
      <div className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 id="add-guardian-title" className="text-base font-bold text-[hsl(var(--foreground))]">
              Add Student Guardian
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm overflow-y-auto flex-1">
          {error && (
            <div
              role="alert"
              className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-600 rounded-md"
              data-testid="add-guardian-error"
            >
              {error}
            </div>
          )}

          {/* 1. Parent Selection */}
          <div>
            <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
              Select Existing Parent <span className="text-red-500">*</span>
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search parent by name or phone..."
                value={parentSearch}
                onChange={(e) => setParentSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-primary"
                data-testid="search-parent-input"
              />
            </div>

            {isLoadingParents ? (
              <div className="flex items-center justify-center p-4 border border-[hsl(var(--border))] rounded-md text-xs text-[hsl(var(--muted-foreground))]">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading parents list...
              </div>
            ) : filteredParents.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-[hsl(var(--border))] rounded-md text-xs text-[hsl(var(--muted-foreground))]">
                No active institute parents found. Add a parent to the CRM first.
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-[hsl(var(--border))] rounded-md divide-y divide-[hsl(var(--border))] bg-[hsl(var(--background))]">
                {filteredParents.map((parent) => {
                  const name = parent.parentIdentity?.name || 'Unnamed Parent';
                  const phone = parent.parentIdentity?.phone || 'No Phone';
                  const isSelected = parent.id === selectedParentId;

                  return (
                    <button
                      type="button"
                      key={parent.id}
                      onClick={() => setSelectedParentId(parent.id)}
                      className={`w-full flex items-center justify-between p-2.5 text-left text-xs transition-colors ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--foreground))]'
                      }`}
                      data-testid={`select-parent-item-${parent.id}`}
                    >
                      <div>
                        <div className="font-semibold text-xs">{name}</div>
                        <div className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">{phone}</div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Parent Confirmation Box */}
          {selectedParent && (
            <div className="p-3 bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-md text-xs space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold">
                Selected CRM Parent:
              </span>
              <p className="font-bold text-[hsl(var(--foreground))]">
                {selectedParent.parentIdentity?.name || 'Unnamed Parent'}
              </p>
              <p className="font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                Phone: {selectedParent.parentIdentity?.phone || 'No phone recorded'}
              </p>
            </div>
          )}

          {/* 2. Relationship Type Selector */}
          <div>
            <label
              htmlFor="add-relationship-type-select"
              className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5"
            >
              Relationship Type <span className="text-red-500">*</span>
            </label>
            <select
              id="add-relationship-type-select"
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as GuardianRelationshipType)}
              disabled={isSubmitting}
              className="w-full h-10 px-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="add-relationship-type-select"
              required
            >
              {Object.entries(GUARDIAN_RELATIONSHIP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Primary Checkbox */}
          <div className="pt-2">
            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => handleTogglePrimary(e.target.checked)}
                disabled={isSubmitting}
                className="mt-0.5 h-4 w-4 rounded border-[hsl(var(--border))] text-primary focus:ring-primary"
                data-testid="add-primary-checkbox"
              />
              <div className="text-xs">
                <span className="font-semibold text-[hsl(var(--foreground))]">Mark as Primary Guardian</span>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5 leading-snug">
                  Setting this guardian as primary will replace the student&apos;s current primary guardian.
                </p>
              </div>
            </label>
          </div>

          {showPrimaryWarning && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-md text-xs leading-relaxed">
              <strong>Notice:</strong> <span className="font-semibold">{existingPrimaryGuardianName}</span> is currently the primary guardian. Adding this guardian as primary will replace {existingPrimaryGuardianName}&apos;s primary designation upon save.
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[hsl(var(--border))] shrink-0">
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
              disabled={isSubmitting || !selectedParentId}
              className="bg-primary text-primary-foreground hover:opacity-90 font-semibold gap-1.5"
              data-testid="submit-add-guardian-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Linking Guardian...</span>
                </>
              ) : (
                <span>Add Guardian</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
