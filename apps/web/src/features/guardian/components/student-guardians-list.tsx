'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@coaching-os/ui';
import { Users, Plus, Edit2, Star, ShieldAlert, AlertCircle, RefreshCw } from 'lucide-react';
import {
  GUARDIAN_RELATIONSHIP_LABELS,
  type StudentGuardianSummaryDTO,
  type GuardianRelationshipType,
  type CreateGuardianFormValues,
} from '../types/guardian-ui.types';
import {
  listStudentGuardians,
  createRelationship,
  updateRelationship,
  setPrimaryGuardian,
  archiveRelationship,
} from '../api/guardian-api';
import { GuardianPrimaryBadge, GuardianRelationshipStatusBadge } from './guardian-status-badge';
import { StudentGuardiansSkeleton } from './student-guardians-skeleton';
import { StudentGuardiansEmptyState } from './student-guardians-empty-state';
import { AddGuardianModal } from './add-guardian-modal';
import { EditGuardianModal } from './edit-guardian-modal';
import { PrimaryReplacementModal } from './primary-replacement-modal';
import { ArchiveGuardianModal } from './archive-guardian-modal';

export interface StudentGuardiansListProps {
  studentId: string;
  userCapabilities?: string[];
  onGuardiansUpdated?: () => void;
}

export function StudentGuardiansList({
  studentId,
  userCapabilities = [],
  onGuardiansUpdated,
}: StudentGuardiansListProps) {
  const [guardians, setGuardians] = useState<StudentGuardianSummaryDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals & Active Actions
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedGuardianForEdit, setSelectedGuardianForEdit] = useState<StudentGuardianSummaryDTO | null>(null);
  const [selectedGuardianForPrimary, setSelectedGuardianForPrimary] = useState<StudentGuardianSummaryDTO | null>(null);
  const [selectedGuardianForArchive, setSelectedGuardianForArchive] = useState<StudentGuardianSummaryDTO | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Capabilities
  const canRead =
    userCapabilities.includes('guardian:read') || userCapabilities.includes('relationship:read');
  const canCreate =
    userCapabilities.includes('guardian:create') || userCapabilities.includes('relationship:create');
  const canUpdate =
    userCapabilities.includes('guardian:update') || userCapabilities.includes('relationship:update');
  const canPrimary =
    userCapabilities.includes('guardian:primary') || userCapabilities.includes('relationship:primary');
  const canArchive =
    userCapabilities.includes('guardian:archive') || userCapabilities.includes('relationship:archive');

  const [refreshKey, setRefreshKey] = useState(0);
  const reloadGuardians = useCallback(() => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!studentId || !canRead) {
      Promise.resolve().then(() => setIsLoading(false));
      return;
    }

    listStudentGuardians(studentId).then((res) => {
      if (!isMounted) return;
      if (res.error) {
        if (res.error.code === 'FORBIDDEN' || res.error.code === 'AUTH_ERROR') {
          setError("You don't have permission to manage guardians.");
        } else if (res.error.code === 'NOT_FOUND') {
          setError('The student or relationship record could not be found.');
        } else {
          setError(res.error.message || 'Something went wrong. Please try again.');
        }
      } else {
        const items: StudentGuardianSummaryDTO[] = (res.data || []).map((item) => ({
          id: item.id,
          relationshipId: item.id,
          instituteParentId: item.instituteParentId,
          relationshipType: item.relationshipType,
          isPrimary: item.isPrimary,
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          parentName: (item as unknown as { parentName?: string }).parentName || null,
          parentPhone: (item as unknown as { parentPhone?: string }).parentPhone || null,
        }));
        setGuardians(items);
        setError(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [studentId, canRead, refreshKey]);

  const activeGuardians = guardians.filter((g) => g.status !== 'archived');
  const archivedGuardians = guardians.filter((g) => g.status === 'archived');
  const currentPrimary = activeGuardians.find((g) => g.isPrimary);

  // Handlers
  const handleAddGuardian = async (values: CreateGuardianFormValues) => {
    setIsSubmitting(true);
    const res = await createRelationship(studentId, values);
    setIsSubmitting(false);

    if (res.error) {
      if (res.error.code === 'CONFLICT' || res.error.code === 'ALREADY_EXISTS') {
        throw new Error('This parent is already linked to this student.');
      } else if (res.error.code === 'FORBIDDEN') {
        throw new Error("You don't have permission to add guardians.");
      } else {
        throw new Error(res.error.message || 'Failed to link guardian.');
      }
    }

    setIsAddModalOpen(false);
    setSuccessMessage('Guardian relationship added successfully.');
    reloadGuardians();
    if (onGuardiansUpdated) onGuardiansUpdated();
  };

  const handleEditRelationship = async (relationshipType: GuardianRelationshipType) => {
    if (!selectedGuardianForEdit) return;
    const relId = selectedGuardianForEdit.relationshipId || selectedGuardianForEdit.id;
    if (!relId) return;

    setIsSubmitting(true);
    const res = await updateRelationship(relId, { relationshipType });
    setIsSubmitting(false);

    if (res.error) {
      if (res.error.code === 'FORBIDDEN') {
        throw new Error("You don't have permission to update relationships.");
      } else {
        throw new Error(res.error.message || 'Failed to update relationship.');
      }
    }

    setSelectedGuardianForEdit(null);
    setSuccessMessage('Relationship type updated successfully.');
    reloadGuardians();
    if (onGuardiansUpdated) onGuardiansUpdated();
  };

  const handleSetPrimary = async () => {
    if (!selectedGuardianForPrimary) return;
    const relId = selectedGuardianForPrimary.relationshipId || selectedGuardianForPrimary.id;
    if (!relId) return;

    setIsSubmitting(true);
    const res = await setPrimaryGuardian(relId);
    setIsSubmitting(false);

    if (res.error) {
      if (res.error.code === 'FORBIDDEN') {
        setError("You don't have permission to set primary guardian.");
      } else {
        setError(res.error.message || 'Failed to promote primary guardian.');
      }
    } else {
      setSuccessMessage('Primary guardian updated successfully.');
      reloadGuardians();
      if (onGuardiansUpdated) onGuardiansUpdated();
    }
    setSelectedGuardianForPrimary(null);
  };

  const handleArchive = async () => {
    if (!selectedGuardianForArchive) return;
    const relId = selectedGuardianForArchive.relationshipId || selectedGuardianForArchive.id;
    if (!relId) return;

    setIsSubmitting(true);
    const res = await archiveRelationship(relId);
    setIsSubmitting(false);

    if (res.error) {
      if (res.error.code === 'FORBIDDEN') {
        setError("You don't have permission to archive relationships.");
      } else {
        setError(res.error.message || 'Failed to archive guardian relationship.');
      }
    } else {
      setSuccessMessage('Guardian relationship archived successfully.');
      reloadGuardians();
      if (onGuardiansUpdated) onGuardiansUpdated();
    }
    setSelectedGuardianForArchive(null);
  };

  if (!canRead) {
    return (
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-md text-xs">
        You don&apos;t have permission to view guardians.
      </div>
    );
  }

  if (isLoading) {
    return <StudentGuardiansSkeleton />;
  }

  return (
    <div className="space-y-4" data-testid="student-guardians-list">
      {/* Top Banner Message */}
      {error && (
        <div
          role="alert"
          className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-600 rounded-md flex items-center justify-between"
          data-testid="guardians-list-error"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={reloadGuardians} className="h-6 px-2 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-md flex items-center justify-between"
          data-testid="guardians-list-success"
        >
          <span>{successMessage}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSuccessMessage(null)}
            className="h-6 px-2 text-xs"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Header & Add Action */}
      <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-primary" aria-hidden="true" />
          <h4 className="text-sm font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">
            Guardians & Family Contacts ({activeGuardians.length})
          </h4>
        </div>

        {canCreate && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="gap-1.5 bg-primary text-primary-foreground hover:opacity-90 font-semibold"
            data-testid="add-guardian-btn"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add Guardian</span>
          </Button>
        )}
      </div>

      {/* Empty State */}
      {guardians.length === 0 ? (
        <StudentGuardiansEmptyState
          onAddGuardian={() => setIsAddModalOpen(true)}
          canCreate={canCreate}
        />
      ) : (
        <div className="space-y-4">
          {/* Active Guardians List */}
          <div className="space-y-3">
            {activeGuardians.map((guardian) => {
              const relLabel = GUARDIAN_RELATIONSHIP_LABELS[guardian.relationshipType] || guardian.relationshipType;
              const parentDisplayName = guardian.parentName || 'Parent CRM Record';
              const parentPhone = guardian.parentPhone || 'Contact phone recorded in parent profile';

              return (
                <div
                  key={guardian.id || guardian.instituteParentId}
                  className="p-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm space-y-3 hover:border-primary/40 transition-colors"
                  data-testid={`guardian-item-${guardian.id || guardian.instituteParentId}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                          {relLabel}
                        </span>
                        <GuardianPrimaryBadge isPrimary={guardian.isPrimary} />
                        <GuardianRelationshipStatusBadge status={guardian.status || 'active'} />
                      </div>

                      <h5 className="text-base font-bold text-[hsl(var(--foreground))] truncate">
                        {parentDisplayName}
                      </h5>

                      <p className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
                        {parentPhone}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[hsl(var(--border))]">
                      {canPrimary && !guardian.isPrimary && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (currentPrimary) {
                              setSelectedGuardianForPrimary(guardian);
                            } else {
                              setSelectedGuardianForPrimary(guardian);
                              handleSetPrimary();
                            }
                          }}
                          className="h-8 px-2.5 text-xs gap-1 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                          data-testid={`set-primary-btn-${guardian.id}`}
                          title="Make Primary Guardian"
                        >
                          <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                          <span>Make Primary</span>
                        </Button>
                      )}

                      {canUpdate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedGuardianForEdit(guardian)}
                          className="h-8 px-2.5 text-xs gap-1 border-[hsl(var(--border))]"
                          data-testid={`edit-guardian-btn-${guardian.id}`}
                          title="Edit Relationship Type"
                        >
                          <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Edit</span>
                        </Button>
                      )}

                      {canArchive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedGuardianForArchive(guardian)}
                          className="h-8 px-2.5 text-xs gap-1 border-red-500/30 text-red-600 hover:bg-red-500/10"
                          data-testid={`archive-guardian-btn-${guardian.id}`}
                          title="Archive Relationship"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Archive</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Secondary Archived Section */}
          {archivedGuardians.length > 0 && (
            <div className="pt-4 border-t border-[hsl(var(--border))] space-y-3">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Archived Relationships ({archivedGuardians.length})
              </h5>
              <div className="space-y-2 opacity-75">
                {archivedGuardians.map((guardian) => {
                  const relLabel = GUARDIAN_RELATIONSHIP_LABELS[guardian.relationshipType] || guardian.relationshipType;
                  return (
                    <div
                      key={guardian.id}
                      className="p-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] flex items-center justify-between text-xs"
                      data-testid={`archived-guardian-item-${guardian.id}`}
                    >
                      <div>
                        <span className="font-semibold text-[hsl(var(--foreground))]">{guardian.parentName || 'Archived Guardian'}</span>
                        <span className="text-[hsl(var(--muted-foreground))] ml-2">({relLabel})</span>
                      </div>
                      <GuardianRelationshipStatusBadge status="archived" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {isAddModalOpen && (
        <AddGuardianModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddGuardian}
          existingPrimaryGuardianName={currentPrimary?.parentName || 'the current primary guardian'}
          isSubmitting={isSubmitting}
        />
      )}

      {selectedGuardianForEdit && (
        <EditGuardianModal
          isOpen={!!selectedGuardianForEdit}
          onClose={() => setSelectedGuardianForEdit(null)}
          onSubmit={handleEditRelationship}
          guardian={selectedGuardianForEdit}
          isSubmitting={isSubmitting}
        />
      )}

      {selectedGuardianForPrimary && currentPrimary && (
        <PrimaryReplacementModal
          isOpen={!!selectedGuardianForPrimary}
          onClose={() => setSelectedGuardianForPrimary(null)}
          onConfirm={handleSetPrimary}
          currentPrimaryName={currentPrimary.parentName || 'Current Primary Guardian'}
          newPrimaryCandidateName={selectedGuardianForPrimary.parentName || 'Selected Guardian'}
          isSubmitting={isSubmitting}
        />
      )}

      {selectedGuardianForArchive && (
        <ArchiveGuardianModal
          isOpen={!!selectedGuardianForArchive}
          onClose={() => setSelectedGuardianForArchive(null)}
          onConfirm={handleArchive}
          guardianName={selectedGuardianForArchive.parentName || 'this parent record'}
          relationshipTypeLabel={
            GUARDIAN_RELATIONSHIP_LABELS[selectedGuardianForArchive.relationshipType] ||
            selectedGuardianForArchive.relationshipType
          }
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
