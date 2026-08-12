'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription, Button } from '@coaching-os/ui';
import { ShieldAlert, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

import { EnrollmentHeader } from './enrollment-header';
import { EnrollmentSkeleton } from './enrollment-skeleton';
import { EnrollmentEmptyState } from './enrollment-empty-state';
import { EnrollmentTable } from './enrollment-table';
import { EnrollmentCard } from './enrollment-card';
import { EnrollmentDetailsModal } from './enrollment-details-modal';
import { EnrollmentFormModal } from './enrollment-form-modal';
import { EnrollmentTransferModal } from './enrollment-transfer-modal';
import { EnrollmentConfirmationModal, type ConfirmationActionType } from './enrollment-confirmation-modal';

import {
  fetchEnrollmentsList,
  createEnrollment,
  activateEnrollment,
  completeEnrollment,
  withdrawEnrollment,
  cancelEnrollment,
  transferEnrollment,
  archiveEnrollment,
  fetchEligibleStudents,
  fetchEligibleBatches,
} from '../api/enrollment-api';

import type {
  EnrichedEnrollmentDTO,
  EnrollmentStatus,
  StudentSummary,
  BatchSummary,
  CreateEnrollmentFormValues,
} from '../types/enrollment-ui.types';

function getRoleCapabilities(role: string): string[] {
  switch (role) {
    case 'owner':
    case 'admin':
      return [
        'enrollment:read',
        'enrollment:create',
        'enrollment:update',
        'enrollment:status',
        'enrollment:transfer',
        'enrollment:archive',
      ];
    case 'staff':
    case 'assistant':
      return [
        'enrollment:read',
        'enrollment:create',
        'enrollment:update',
        'enrollment:status',
        'enrollment:transfer',
      ];
    case 'teacher':
      return ['enrollment:read'];
    default:
      return [];
  }
}

export function EnrollmentContent() {
  const router = useRouter();

  // Context & Access Control State
  const [userCapabilities, setUserCapabilities] = useState<string[]>([]);
  const [isContextLoading, setIsContextLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // Data & List State
  const [enrollments, setEnrollments] = useState<EnrichedEnrollmentDTO[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudentsAndBatches, setIsLoadingStudentsAndBatches] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter & Pagination State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EnrollmentStatus>('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal States
  const [selectedDetails, setSelectedDetails] = useState<EnrichedEnrollmentDTO | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [selectedTransfer, setSelectedTransfer] = useState<EnrichedEnrollmentDTO | null>(null);

  const [confirmationAction, setConfirmationAction] = useState<ConfirmationActionType | null>(null);
  const [selectedConfirmation, setSelectedConfirmation] = useState<EnrichedEnrollmentDTO | null>(null);

  // Capabilities
  const canRead = userCapabilities.includes('enrollment:read');
  const canCreate = userCapabilities.includes('enrollment:create');
  const canUpdate = userCapabilities.includes('enrollment:update');
  const canStatus = userCapabilities.includes('enrollment:status');
  const canTransfer = userCapabilities.includes('enrollment:transfer');
  const canArchive = userCapabilities.includes('enrollment:archive');

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
          if (!caps.includes('enrollment:read')) {
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

  // Load auxiliary data for student/batch selectors
  const loadStudentsAndBatches = useCallback(async () => {
    setIsLoadingStudentsAndBatches(true);
    const [stList, btList] = await Promise.all([fetchEligibleStudents(), fetchEligibleBatches()]);
    setStudents(stList);
    setBatches(btList);
    setIsLoadingStudentsAndBatches(false);
  }, []);

  // 2. Fetch Enrollments List
  const loadEnrollments = useCallback(async () => {
    if (isContextLoading || accessDenied || !canRead) return;

    setIsLoading(true);
    setError(null);

    const res = await fetchEnrollmentsList({
      status: statusFilter,
      page,
      limit,
    });

    if (res.success) {
      const rawList = res.data || [];
      // Hydrate flat DTOs with student and batch display info if present in local lookup
      const [stList, btList] = await Promise.all([fetchEligibleStudents(), fetchEligibleBatches()]);
      setStudents(stList);
      setBatches(btList);

      const studentMap = new Map(stList.map((s) => [s.id, s]));
      const batchMap = new Map(btList.map((b) => [b.id, b]));

      const enriched: EnrichedEnrollmentDTO[] = rawList.map((item) => ({
        ...item,
        student: studentMap.get(item.studentId),
        batch: batchMap.get(item.batchId),
      }));

      // Apply client-side search filtering over current page
      let filtered = enriched;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        filtered = enriched.filter((e) => {
          const sName = (e.student?.displayName || '').toLowerCase();
          const sAdm = (e.student?.admissionNumber || '').toLowerCase();
          const bName = (e.batch?.name || '').toLowerCase();
          const bCode = (e.batch?.code || '').toLowerCase();
          return sName.includes(q) || sAdm.includes(q) || bName.includes(q) || bCode.includes(q);
        });
      }

      setEnrollments(filtered);
      setTotal(rawList.length);
      setTotalPages(1);
    } else {
      setError(res.error?.message || 'Failed to load enrollment records.');
    }

    setIsLoading(false);
  }, [isContextLoading, accessDenied, canRead, statusFilter, page, limit, search]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadEnrollments();
      }
    });
    return () => {
      active = false;
    };
  }, [loadEnrollments]);

  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusFilterChange = (val: 'all' | EnrollmentStatus) => {
    setStatusFilter(val);
    setPage(1);
  };

  // Create Enrollment Handler
  const handleCreateSubmit = async (values: CreateEnrollmentFormValues) => {
    const res = await createEnrollment(values);
    if (res.success) {
      setSuccessMessage('Student enrolled successfully.');
      await loadEnrollments();
      return { success: true };
    }
    // Stale/concurrent conflict refresh
    if (res.error?.code === 'CONFLICT') {
      await loadEnrollments();
    }
    return { success: false, error: res.error?.message || 'Failed to create enrollment.' };
  };

  // Direct Activate Handler
  const handleActivate = async (enrollment: EnrichedEnrollmentDTO) => {
    const res = await activateEnrollment(enrollment.id);
    if (res.success) {
      setSuccessMessage('Enrollment activated successfully.');
      await loadEnrollments();
    } else {
      setError(res.error?.message || 'Failed to activate enrollment.');
      await loadEnrollments();
    }
  };

  // Direct Complete Handler
  const handleComplete = async (enrollment: EnrichedEnrollmentDTO) => {
    const res = await completeEnrollment(enrollment.id);
    if (res.success) {
      setSuccessMessage('Enrollment completed successfully.');
      await loadEnrollments();
    } else {
      setError(res.error?.message || 'Failed to complete enrollment.');
      await loadEnrollments();
    }
  };

  // Confirmation Confirm Handler (Withdraw, Cancel, Archive)
  const handleConfirmationConfirm = async () => {
    if (!selectedConfirmation || !confirmationAction) return;

    let res;
    if (confirmationAction === 'withdraw') {
      res = await withdrawEnrollment(selectedConfirmation.id);
    } else if (confirmationAction === 'cancel') {
      res = await cancelEnrollment(selectedConfirmation.id);
    } else if (confirmationAction === 'archive') {
      res = await archiveEnrollment(selectedConfirmation.id);
    }

    if (res?.success) {
      setSuccessMessage(
        confirmationAction === 'withdraw'
          ? 'Enrollment withdrawn successfully.'
          : confirmationAction === 'cancel'
            ? 'Enrollment cancelled successfully.'
            : 'Enrollment record archived.',
      );
      setSelectedConfirmation(null);
      setConfirmationAction(null);
      await loadEnrollments();
    } else {
      throw new Error(res?.error?.message || 'Action failed.');
    }
  };

  // Transfer Confirm Handler
  const handleTransferConfirm = async (enrollmentId: string, targetBatchId: string) => {
    const res = await transferEnrollment(enrollmentId, { targetBatchId });
    if (res.success) {
      setSuccessMessage('Atomic student batch transfer completed successfully.');
      await loadEnrollments();
      return { success: true };
    }
    // Stale state conflict refresh
    await loadEnrollments();
    return { success: false, error: res.error?.message || 'Transfer failed.' };
  };

  const hasActiveFilters = useMemo(
    () => !!search.trim() || statusFilter !== 'all',
    [search, statusFilter],
  );

  if (isContextLoading) {
    return <EnrollmentSkeleton />;
  }

  if (accessDenied || !canRead) {
    return (
      <div className="p-6" data-testid="access-denied-alert">
        <Alert variant="destructive">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have the required permissions (<code className="font-mono text-xs">enrollment:read</code>) to access the Staff Enrollment workspace.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="enrollment-content">
      {/* Header & Control Bar */}
      <EnrollmentHeader
        totalCount={total}
        search={search}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        canCreate={canCreate}
        onAddEnrollmentClick={() => {
          loadStudentsAndBatches();
          setIsAddModalOpen(true);
        }}
      />

      {/* Success Notification Alert */}
      {successMessage && (
        <Alert
          className="bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
          data-testid="enrollment-success-alert"
        >
          <AlertTitle className="text-xs font-semibold">Operation Successful</AlertTitle>
          <AlertDescription className="text-xs">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Error Notification Alert */}
      {error && (
        <Alert variant="destructive" data-testid="enrollment-error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between text-xs">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => loadEnrollments()} className="h-7 px-2 gap-1 text-xs">
              <RefreshCw className="h-3 w-3" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Data Presentation (Loading / Empty / Table & Cards) */}
      {isLoading ? (
        <EnrollmentSkeleton />
      ) : enrollments.length === 0 ? (
        <EnrollmentEmptyState
          hasFilters={hasActiveFilters}
          canCreate={canCreate}
          onAddClick={() => {
            loadStudentsAndBatches();
            setIsAddModalOpen(true);
          }}
          onClearFilters={() => {
            setSearch('');
            setStatusFilter('all');
            setPage(1);
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <EnrollmentTable
            enrollments={enrollments}
            canUpdate={canUpdate}
            canStatus={canStatus}
            canTransfer={canTransfer}
            canArchive={canArchive}
            onViewDetails={(e) => setSelectedDetails(e)}
            onActivate={handleActivate}
            onComplete={handleComplete}
            onWithdraw={(e) => {
              setSelectedConfirmation(e);
              setConfirmationAction('withdraw');
            }}
            onCancel={(e) => {
              setSelectedConfirmation(e);
              setConfirmationAction('cancel');
            }}
            onTransfer={(e) => {
              loadStudentsAndBatches();
              setSelectedTransfer(e);
            }}
            onArchive={(e) => {
              setSelectedConfirmation(e);
              setConfirmationAction('archive');
            }}
          />

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {enrollments.map((e) => (
              <EnrollmentCard
                key={e.id}
                enrollment={e}
                canUpdate={canUpdate}
                canStatus={canStatus}
                canTransfer={canTransfer}
                canArchive={canArchive}
                onViewDetails={(e) => setSelectedDetails(e)}
                onActivate={handleActivate}
                onComplete={handleComplete}
                onWithdraw={(e) => {
                  setSelectedConfirmation(e);
                  setConfirmationAction('withdraw');
                }}
                onCancel={(e) => {
                  setSelectedConfirmation(e);
                  setConfirmationAction('cancel');
                }}
                onTransfer={(e) => {
                  loadStudentsAndBatches();
                  setSelectedTransfer(e);
                }}
                onArchive={(e) => {
                  setSelectedConfirmation(e);
                  setConfirmationAction('archive');
                }}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] px-4 py-3 text-xs">
              <span className="text-[hsl(var(--muted-foreground))]">
                Page <strong className="text-[hsl(var(--foreground))]">{page}</strong> of{' '}
                <strong className="text-[hsl(var(--foreground))]">{totalPages}</strong> ({total} records)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 gap-1"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Details View Modal */}
      <EnrollmentDetailsModal
        isOpen={!!selectedDetails}
        onClose={() => setSelectedDetails(null)}
        enrollment={selectedDetails}
      />

      {/* Add Enrollment Modal */}
      <EnrollmentFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateSubmit}
        students={students}
        batches={batches}
        isLoadingStudentsAndBatches={isLoadingStudentsAndBatches}
      />

      {/* Transfer Batch Modal */}
      <EnrollmentTransferModal
        isOpen={!!selectedTransfer}
        onClose={() => setSelectedTransfer(null)}
        enrollment={selectedTransfer}
        onConfirmTransfer={handleTransferConfirm}
        batches={batches}
      />

      {/* Confirmation Modal */}
      <EnrollmentConfirmationModal
        isOpen={!!confirmationAction}
        actionType={confirmationAction}
        enrollment={selectedConfirmation}
        onClose={() => {
          setConfirmationAction(null);
          setSelectedConfirmation(null);
        }}
        onConfirm={handleConfirmationConfirm}
      />
    </div>
  );
}
