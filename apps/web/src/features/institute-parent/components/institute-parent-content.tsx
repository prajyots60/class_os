'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription, Button } from '@coaching-os/ui';
import { ShieldAlert, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

import { InstituteParentHeader } from './institute-parent-header';
import { InstituteParentSkeleton } from './institute-parent-skeleton';
import { InstituteParentEmptyState } from './institute-parent-empty-state';
import { InstituteParentTable } from './institute-parent-table';
import { InstituteParentCard } from './institute-parent-card';
import { InstituteParentDetailsModal } from './institute-parent-details-modal';
import { InstituteParentFormModal } from './institute-parent-form-modal';
import { InstituteParentArchiveModal } from './institute-parent-archive-modal';

import {
  fetchParentsList,
  createParent,
  updateParent,
  archiveParent,
} from '../api/institute-parent-api';

import type {
  InstituteParentDTO,
  CreateParentFormValues,
  EditParentFormValues,
} from '../types/institute-parent-ui.types';

function getRoleCapabilities(role: string): string[] {
  switch (role) {
    case 'owner':
    case 'admin':
      return ['parent:read', 'parent:create', 'parent:update', 'parent:archive'];
    case 'staff':
      return ['parent:read', 'parent:create', 'parent:update'];
    case 'teacher':
      return ['parent:read'];
    default:
      return [];
  }
}

export function InstituteParentContent() {
  const router = useRouter();

  // Tenant / Capability State
  const [userCapabilities, setUserCapabilities] = useState<string[]>([]);
  const [isContextLoading, setIsContextLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // List & Data State
  const [parents, setParents] = useState<InstituteParentDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter & Pagination State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal Dialog States
  const [selectedParentForDetails, setSelectedParentForDetails] = useState<InstituteParentDTO | null>(null);
  const [selectedParentForEdit, setSelectedParentForEdit] = useState<InstituteParentDTO | null>(null);
  const [selectedParentForArchive, setSelectedParentForArchive] = useState<InstituteParentDTO | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Derive Capabilities from user context
  const canRead = userCapabilities.includes('parent:read');
  const canCreate = userCapabilities.includes('parent:create');
  const canUpdate = userCapabilities.includes('parent:update');
  const canArchive = userCapabilities.includes('parent:archive');

  // 1. Resolve Session & Tenant Context
  useEffect(() => {
    let isMounted = true;

    async function loadContext() {
      setIsContextLoading(true);
      try {
        const res = await fetch('/api/dashboard/context', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!isMounted) return;

        if (res.status === 401) {
          router.push('/sign-in');
          return;
        }

        const data = await res.json();

        if (res.ok && data.hasTenant && data.tenantContext?.role) {
          const caps = getRoleCapabilities(data.tenantContext.role);
          setUserCapabilities(caps);
          if (!caps.includes('parent:read')) {
            setAccessDenied(true);
          }
        } else {
          setAccessDenied(true);
        }
      } catch {
        if (isMounted) {
          setError('Network error resolving authentication context.');
        }
      } finally {
        if (isMounted) {
          setIsContextLoading(false);
        }
      }
    }

    loadContext();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // 2. Fetch Parents List from API
  const loadParents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const res = await fetchParentsList({
      status: statusFilter,
      page,
      limit,
    });

    if (res.success) {
      setParents(res.data || []);
      setTotal(res.meta?.total || 0);
      setTotalPages(res.meta?.totalPages || 1);
    } else {
      setError(res.error?.message || 'We couldn\'t load parent records.');
      setParents([]);
    }

    setIsLoading(false);
  }, [statusFilter, page, limit]);

  useEffect(() => {
    if (!isContextLoading && !accessDenied && canRead) {
      loadParents();
    }
  }, [isContextLoading, accessDenied, canRead, loadParents]);

  // Filter parent list on the client for search query (while preserving API paging contract)
  const filteredParents = useMemo(() => {
    if (!search.trim()) return parents;
    const term = search.toLowerCase().trim();
    return parents.filter((p) => {
      const name = p.parentIdentity?.name?.toLowerCase() || '';
      const phone = p.parentIdentity?.phone || '';
      const notes = p.notes?.toLowerCase() || '';
      return name.includes(term) || phone.includes(term) || notes.includes(term);
    });
  }, [parents, search]);

  // Handlers for Modals & Actions
  const handleOpenAddModal = () => {
    setModalError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (parent: InstituteParentDTO) => {
    setModalError(null);
    setSelectedParentForEdit(parent);
  };

  const handleOpenArchiveModal = (parent: InstituteParentDTO) => {
    setModalError(null);
    setSelectedParentForArchive(parent);
  };

  const handleOpenDetailsModal = (parent: InstituteParentDTO) => {
    setSelectedParentForDetails(parent);
  };

  // Submit Add Parent Form
  const handleSubmitCreate = async (values: CreateParentFormValues): Promise<boolean> => {
    setIsSubmitting(true);
    setModalError(null);
    setSuccessMessage(null);

    const res = await createParent(values);

    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage('Parent added successfully.');
      loadParents();
      return true;
    } else {
      setModalError(res.error?.message || 'Failed to add parent record.');
      return false;
    }
  };

  // Submit Edit Parent Form
  const handleSubmitEdit = async (id: string, values: EditParentFormValues): Promise<boolean> => {
    setIsSubmitting(true);
    setModalError(null);
    setSuccessMessage(null);

    const res = await updateParent(id, values);

    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage('Parent record updated successfully.');
      loadParents();
      return true;
    } else {
      setModalError(res.error?.message || 'Failed to update parent record.');
      return false;
    }
  };

  // Submit Confirm Archive
  const handleConfirmArchive = async (id: string): Promise<boolean> => {
    setIsSubmitting(true);
    setModalError(null);
    setSuccessMessage(null);

    const res = await archiveParent(id);

    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage('Parent archived successfully.');
      loadParents();
      return true;
    } else {
      setModalError(res.error?.message || 'Failed to archive parent record.');
      return false;
    }
  };

  // Render Access Denied
  if (!isContextLoading && accessDenied) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6" data-testid="parent-access-denied">
        <Alert variant="destructive" className="border-[hsl(var(--destructive)/0.5)]">
          <ShieldAlert className="h-5 w-5 mr-2 shrink-0" aria-hidden="true" />
          <div>
            <AlertTitle className="text-sm font-bold">Access Restricted</AlertTitle>
            <AlertDescription className="text-xs mt-1">
              You do not have the required authorization capability (<code className="font-mono text-[11px]">parent:read</code>) to access the Institute Parent CRM module. Please contact your institute administrator.
            </AlertDescription>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6" data-testid="institute-parent-crm">
      {/* Header Controls */}
      <InstituteParentHeader
        search={search}
        statusFilter={statusFilter}
        canCreate={canCreate}
        totalParents={total}
        onSearchChange={setSearch}
        onStatusFilterChange={(val) => {
          setStatusFilter(val);
          setPage(1);
        }}
        onAddParent={handleOpenAddModal}
      />

      {/* Success Notification Alert */}
      {successMessage && (
        <Alert variant="default" className="bg-[hsl(var(--primary)/0.1)] border-[hsl(var(--primary)/0.3)] text-[hsl(var(--foreground))] py-2 px-3 text-xs" data-testid="success-alert">
          <div className="flex items-center justify-between w-full">
            <span>{successMessage}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSuccessMessage(null)}
              className="h-6 px-2 text-[10px] border-[hsl(var(--border))]"
            >
              Dismiss
            </Button>
          </div>
        </Alert>
      )}

      {/* Error Notification Alert */}
      {error && (
        <Alert variant="destructive" className="py-2.5 px-3 text-xs" data-testid="error-alert">
          <AlertCircle className="h-4 w-4 mr-2 shrink-0" aria-hidden="true" />
          <div className="flex items-center justify-between w-full">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadParents}
              className="h-6 px-2 text-[10px] border-[hsl(var(--border))]"
            >
              <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* Main Content Body */}
      {isContextLoading || isLoading ? (
        <InstituteParentSkeleton />
      ) : filteredParents.length === 0 ? (
        <InstituteParentEmptyState
          hasFilters={!!search.trim() || statusFilter !== 'all'}
          canCreate={canCreate}
          onAddParent={handleOpenAddModal}
          onClearFilters={() => {
            setSearch('');
            setStatusFilter('all');
            setPage(1);
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <InstituteParentTable
              parents={filteredParents}
              canUpdate={canUpdate}
              canArchive={canArchive}
              onViewDetails={handleOpenDetailsModal}
              onEdit={handleOpenEditModal}
              onArchive={handleOpenArchiveModal}
            />
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredParents.map((parent) => (
              <InstituteParentCard
                key={parent.id}
                parent={parent}
                canUpdate={canUpdate}
                canArchive={canArchive}
                onViewDetails={handleOpenDetailsModal}
                onEdit={handleOpenEditModal}
                onArchive={handleOpenArchiveModal}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
              <div>
                Showing page <span className="font-semibold text-[hsl(var(--foreground))]">{page}</span> of{' '}
                <span className="font-semibold text-[hsl(var(--foreground))]">{totalPages}</span> ({total} parents)
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 px-2 border-[hsl(var(--border))]"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 px-2 border-[hsl(var(--border))]"
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <InstituteParentDetailsModal
        parent={selectedParentForDetails}
        isOpen={!!selectedParentForDetails}
        onClose={() => setSelectedParentForDetails(null)}
        onEdit={handleOpenEditModal}
        canUpdate={canUpdate}
      />

      <InstituteParentFormModal
        mode="create"
        isOpen={isAddModalOpen}
        isSubmitting={isSubmitting}
        error={modalError}
        onClose={() => setIsAddModalOpen(false)}
        onSubmitCreate={handleSubmitCreate}
        onSubmitEdit={handleSubmitEdit}
      />

      <InstituteParentFormModal
        mode="edit"
        parent={selectedParentForEdit}
        isOpen={!!selectedParentForEdit}
        isSubmitting={isSubmitting}
        error={modalError}
        onClose={() => setSelectedParentForEdit(null)}
        onSubmitCreate={handleSubmitCreate}
        onSubmitEdit={handleSubmitEdit}
      />

      <InstituteParentArchiveModal
        parent={selectedParentForArchive}
        isOpen={!!selectedParentForArchive}
        isSubmitting={isSubmitting}
        error={modalError}
        onClose={() => setSelectedParentForArchive(null)}
        onConfirmArchive={handleConfirmArchive}
      />
    </div>
  );
}
