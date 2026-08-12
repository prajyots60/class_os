'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription, Button } from '@coaching-os/ui';
import { ShieldAlert, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

import { StudentHeader } from './student-header';
import { StudentSkeleton } from './student-skeleton';
import { StudentEmptyState } from './student-empty-state';
import { StudentTable } from './student-table';
import { StudentCard } from './student-card';
import { StudentDetailsModal } from './student-details-modal';
import { StudentFormModal } from './student-form-modal';
import { StudentAdmissionModal } from './student-admission-actions';
import { StudentLifecycleModal } from './student-lifecycle-actions';

import {
  fetchStudentsList,
  createStudent,
  updateStudent,
  admitStudent,
  rejectStudent,
  cancelStudentAdmission,
  activateStudent,
  deactivateStudent,
  archiveStudent,
} from '../api/student-api';

import type {
  StudentDTO,
  CreateStudentFormValues,
  EditStudentFormValues,
  StudentAdmissionStatus,
  StudentStatus,
} from '../types/student-ui.types';

function getRoleCapabilities(role: string): string[] {
  switch (role) {
    case 'owner':
    case 'admin':
      return [
        'student:read',
        'student:create',
        'student:update',
        'student:archive',
        'guardian:read',
        'guardian:create',
        'guardian:update',
        'guardian:archive',
        'guardian:primary',
        'relationship:read',
        'relationship:create',
        'relationship:update',
        'relationship:archive',
        'relationship:primary',
      ];
    case 'staff':
    case 'assistant':
      return [
        'student:read',
        'student:create',
        'student:update',
        'guardian:read',
        'guardian:create',
        'guardian:update',
        'guardian:primary',
        'relationship:read',
        'relationship:create',
        'relationship:update',
        'relationship:primary',
      ];
    case 'teacher':
      return ['student:read', 'guardian:read', 'relationship:read'];
    default:
      return [];
  }
}

export function StudentContent() {
  const router = useRouter();

  // Tenant & Capability State
  const [userCapabilities, setUserCapabilities] = useState<string[]>([]);
  const [isContextLoading, setIsContextLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // List & Data State
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter & Pagination State
  const [search, setSearch] = useState('');
  const [admissionStatusFilter, setAdmissionStatusFilter] = useState<'all' | StudentAdmissionStatus>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | StudentStatus>('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal States
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<StudentDTO | null>(null);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<StudentDTO | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [admissionModalType, setAdmissionModalType] = useState<'admit' | 'reject' | 'cancel' | null>(null);
  const [selectedStudentForAdmission, setSelectedStudentForAdmission] = useState<StudentDTO | null>(null);

  const [lifecycleModalType, setLifecycleModalType] = useState<'activate' | 'deactivate' | 'archive' | null>(null);
  const [selectedStudentForLifecycle, setSelectedStudentForLifecycle] = useState<StudentDTO | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Capabilities
  const canRead = userCapabilities.includes('student:read');
  const canCreate = userCapabilities.includes('student:create');
  const canUpdate = userCapabilities.includes('student:update');
  const canArchive = userCapabilities.includes('student:archive');

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
          if (!caps.includes('student:read')) {
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

  // 2. Fetch Students List
  const loadStudents = useCallback(async () => {
    if (isContextLoading || accessDenied || !canRead) return;

    setIsLoading(true);
    setError(null);

    const res = await fetchStudentsList({
      search,
      admissionStatus: admissionStatusFilter,
      status: statusFilter,
      page,
      limit,
    });

    if (res.success) {
      setStudents(res.data || []);
      setTotal(res.meta?.total || 0);
      setTotalPages(res.meta?.totalPages || 1);
    } else {
      setError(res.error?.message || 'Failed to load student records.');
    }

    setIsLoading(false);
  }, [isContextLoading, accessDenied, canRead, search, admissionStatusFilter, statusFilter, page, limit]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadStudents();
      }
    });
    return () => {
      active = false;
    };
  }, [loadStudents]);

  // Success Message Auto-Dismiss
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Reset pagination when filters change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleAdmissionStatusFilterChange = (val: 'all' | StudentAdmissionStatus) => {
    setAdmissionStatusFilter(val);
    setPage(1);
  };

  const handleStatusFilterChange = (val: 'all' | StudentStatus) => {
    setStatusFilter(val);
    setPage(1);
  };

  // Form Submission (Add or Edit)
  const handleFormSubmit = async (values: CreateStudentFormValues | EditStudentFormValues) => {
    setIsSubmitting(true);
    setModalError(null);

    if (selectedStudentForEdit) {
      const res = await updateStudent(selectedStudentForEdit.id, values as EditStudentFormValues);
      if (res.success) {
        setSuccessMessage(`Updated profile for ${selectedStudentForEdit.displayName}.`);
        setSelectedStudentForEdit(null);
        await loadStudents();
      } else {
        setModalError(res.error?.message || 'Failed to update student profile.');
      }
    } else {
      const res = await createStudent(values as CreateStudentFormValues);
      if (res.success) {
        setSuccessMessage('Student record created successfully in pending admission state.');
        setIsAddModalOpen(false);
        await loadStudents();
      } else {
        setModalError(res.error?.message || 'Failed to create student record.');
      }
    }

    setIsSubmitting(false);
  };

  // Admission Action Confirm
  const handleAdmissionConfirm = async (admissionDate?: string) => {
    if (!selectedStudentForAdmission || !admissionModalType) return;
    setIsSubmitting(true);
    setModalError(null);

    let res;
    if (admissionModalType === 'admit') {
      res = await admitStudent(selectedStudentForAdmission.id, { admissionDate });
    } else if (admissionModalType === 'reject') {
      res = await rejectStudent(selectedStudentForAdmission.id);
    } else {
      res = await cancelStudentAdmission(selectedStudentForAdmission.id);
    }

    if (res.success) {
      setSuccessMessage(
        admissionModalType === 'admit'
          ? `Admitted ${selectedStudentForAdmission.displayName} successfully.`
          : admissionModalType === 'reject'
            ? `Rejected admission for ${selectedStudentForAdmission.displayName}.`
            : `Cancelled admission for ${selectedStudentForAdmission.displayName}.`,
      );
      setSelectedStudentForAdmission(null);
      setAdmissionModalType(null);
      await loadStudents();
    } else {
      setModalError(res.error?.message || 'Failed to complete admission action.');
    }

    setIsSubmitting(false);
  };

  // Lifecycle Action Confirm
  const handleLifecycleConfirm = async () => {
    if (!selectedStudentForLifecycle || !lifecycleModalType) return;
    setIsSubmitting(true);
    setModalError(null);

    let res;
    if (lifecycleModalType === 'activate') {
      res = await activateStudent(selectedStudentForLifecycle.id);
    } else if (lifecycleModalType === 'deactivate') {
      res = await deactivateStudent(selectedStudentForLifecycle.id);
    } else {
      res = await archiveStudent(selectedStudentForLifecycle.id);
    }

    if (res.success) {
      setSuccessMessage(
        lifecycleModalType === 'activate'
          ? `Activated standing for ${selectedStudentForLifecycle.displayName}.`
          : lifecycleModalType === 'deactivate'
            ? `Deactivated standing for ${selectedStudentForLifecycle.displayName}.`
            : `Archived record for ${selectedStudentForLifecycle.displayName}.`,
      );
      setSelectedStudentForLifecycle(null);
      setLifecycleModalType(null);
      await loadStudents();
    } else {
      setModalError(res.error?.message || 'Failed to complete standing lifecycle action.');
    }

    setIsSubmitting(false);
  };

  const isSearchOrFilterActive = useMemo(
    () => !!search.trim() || admissionStatusFilter !== 'all' || statusFilter !== 'all',
    [search, admissionStatusFilter, statusFilter],
  );

  // Render Skeleton while loading context
  if (isContextLoading) {
    return <StudentSkeleton />;
  }

  // Access Denied State
  if (accessDenied || !canRead) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have the required permissions (<code className="font-mono text-xs">student:read</code>) to access the Student CRM module.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="student-content">
      {/* Header & Controls */}
      <StudentHeader
        totalCount={total}
        search={search}
        onSearchChange={handleSearchChange}
        admissionStatusFilter={admissionStatusFilter}
        onAdmissionStatusFilterChange={handleAdmissionStatusFilterChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        canCreate={canCreate}
        onAddStudentClick={() => {
          setSelectedStudentForEdit(null);
          setModalError(null);
          setIsAddModalOpen(true);
        }}
      />

      {/* Success Notification Alert */}
      {successMessage && (
        <Alert className="bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          <AlertTitle className="text-xs font-semibold">Operation Successful</AlertTitle>
          <AlertDescription className="text-xs">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Error Notification Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between text-xs">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => loadStudents()} className="h-7 px-2 gap-1 text-xs">
              <RefreshCw className="h-3 w-3" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Data Presentation (Loading / Empty / Table & Cards) */}
      {isLoading ? (
        <StudentSkeleton />
      ) : students.length === 0 ? (
        <StudentEmptyState
          isSearchOrFilterActive={isSearchOrFilterActive}
          canCreate={canCreate}
          onAddStudentClick={() => setIsAddModalOpen(true)}
          onResetFiltersClick={() => {
            setSearch('');
            setAdmissionStatusFilter('all');
            setStatusFilter('all');
            setPage(1);
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <StudentTable
            students={students}
            canUpdate={canUpdate}
            canArchive={canArchive}
            onViewDetails={(s) => setSelectedStudentForDetails(s)}
            onEdit={(s) => {
              setSelectedStudentForEdit(s);
              setModalError(null);
            }}
            onAdmit={(s) => {
              setSelectedStudentForAdmission(s);
              setAdmissionModalType('admit');
              setModalError(null);
            }}
            onReject={(s) => {
              setSelectedStudentForAdmission(s);
              setAdmissionModalType('reject');
              setModalError(null);
            }}
            onCancel={(s) => {
              setSelectedStudentForAdmission(s);
              setAdmissionModalType('cancel');
              setModalError(null);
            }}
            onActivate={(s) => {
              setSelectedStudentForLifecycle(s);
              setLifecycleModalType('activate');
              setModalError(null);
            }}
            onDeactivate={(s) => {
              setSelectedStudentForLifecycle(s);
              setLifecycleModalType('deactivate');
              setModalError(null);
            }}
            onArchive={(s) => {
              setSelectedStudentForLifecycle(s);
              setLifecycleModalType('archive');
              setModalError(null);
            }}
          />

          {/* Mobile Card List View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {students.map((s) => (
              <StudentCard
                key={s.id}
                student={s}
                canUpdate={canUpdate}
                canArchive={canArchive}
                onViewDetails={(s) => setSelectedStudentForDetails(s)}
                onEdit={(s) => {
                  setSelectedStudentForEdit(s);
                  setModalError(null);
                }}
                onAdmit={(s) => {
                  setSelectedStudentForAdmission(s);
                  setAdmissionModalType('admit');
                  setModalError(null);
                }}
                onReject={(s) => {
                  setSelectedStudentForAdmission(s);
                  setAdmissionModalType('reject');
                  setModalError(null);
                }}
                onCancel={(s) => {
                  setSelectedStudentForAdmission(s);
                  setAdmissionModalType('cancel');
                  setModalError(null);
                }}
                onActivate={(s) => {
                  setSelectedStudentForLifecycle(s);
                  setLifecycleModalType('activate');
                  setModalError(null);
                }}
                onDeactivate={(s) => {
                  setSelectedStudentForLifecycle(s);
                  setLifecycleModalType('deactivate');
                  setModalError(null);
                }}
                onArchive={(s) => {
                  setSelectedStudentForLifecycle(s);
                  setLifecycleModalType('archive');
                  setModalError(null);
                }}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] px-4 py-3 text-xs">
              <span className="text-[hsl(var(--muted-foreground))]">
                Page <strong className="text-[hsl(var(--foreground))]">{page}</strong> of{' '}
                <strong className="text-[hsl(var(--foreground))]">{totalPages}</strong> ({total} total records)
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
      <StudentDetailsModal
        isOpen={!!selectedStudentForDetails}
        onClose={() => setSelectedStudentForDetails(null)}
        student={selectedStudentForDetails}
        userCapabilities={userCapabilities}
      />

      {/* Add / Edit Form Modal */}
      <StudentFormModal
        isOpen={isAddModalOpen || !!selectedStudentForEdit}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedStudentForEdit(null);
          setModalError(null);
        }}
        onSubmit={handleFormSubmit}
        student={selectedStudentForEdit}
        isSubmitting={isSubmitting}
        serverError={modalError}
      />

      {/* Admission Workflow Modal */}
      <StudentAdmissionModal
        isOpen={!!admissionModalType}
        type={admissionModalType}
        student={selectedStudentForAdmission}
        onClose={() => {
          setAdmissionModalType(null);
          setSelectedStudentForAdmission(null);
          setModalError(null);
        }}
        onConfirm={handleAdmissionConfirm}
        isSubmitting={isSubmitting}
        error={modalError}
      />

      {/* Lifecycle Workflow Modal */}
      <StudentLifecycleModal
        isOpen={!!lifecycleModalType}
        type={lifecycleModalType}
        student={selectedStudentForLifecycle}
        onClose={() => {
          setLifecycleModalType(null);
          setSelectedStudentForLifecycle(null);
          setModalError(null);
        }}
        onConfirm={handleLifecycleConfirm}
        isSubmitting={isSubmitting}
        error={modalError}
      />
    </div>
  );
}
