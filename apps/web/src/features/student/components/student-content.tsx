'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription, Button } from '@coaching-os/ui';
import { ShieldAlert, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

import { StudentHeader } from './student-header';
import { StudentSkeleton } from './student-skeleton';
import { StudentEmptyState } from './student-empty-state';
import { StudentOperationalTable, type StudentRowItem } from './student-operational-table';
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

function StudentContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Context Initialization
  const initialAction = searchParams.get('action');

  // Tenant & Capability State
  const [userCapabilities, setUserCapabilities] = useState<string[]>([]);
  const [isContextLoading, setIsContextLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // List & Data State
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal States
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<StudentDTO | null>(null);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<StudentDTO | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(initialAction === 'add');

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

  // Convert RowItem to StudentDTO
  const rowToDto = (s: StudentRowItem): StudentDTO => ({
    id: s.id,
    instituteId: '',
    admissionNumber: s.admissionNumber,
    firstName: s.displayName.split(' ')[0] || s.displayName,
    middleName: null,
    lastName: s.displayName.split(' ').slice(1).join(' ') || '',
    displayName: s.displayName,
    dateOfBirth: null,
    gender: null,
    phone: s.phone || null,
    email: s.email || null,
    address: null,
    city: null,
    state: null,
    postalCode: null,
    admissionDate: null,
    status: s.status as StudentStatus,
    admissionStatus: s.admissionStatus as StudentAdmissionStatus,
    createdAt: s.createdAt,
    updatedAt: s.createdAt,
    deletedAt: null,
  });

  // Action Handlers
  const handleFormSubmit = async (values: CreateStudentFormValues | EditStudentFormValues) => {
    setIsSubmitting(true);
    setModalError(null);

    try {
      if (selectedStudentForEdit) {
        const res = await updateStudent(selectedStudentForEdit.id, values as EditStudentFormValues);
        if (res.success) {
          setSuccessMessage(`Updated profile for ${values.firstName} ${values.lastName}.`);
          setSelectedStudentForEdit(null);
        } else {
          setModalError(res.error?.message || 'Failed to update student profile.');
        }
      } else {
        const res = await createStudent(values as CreateStudentFormValues);
        if (res.success) {
          setSuccessMessage(`Created student record for ${values.firstName} ${values.lastName}.`);
          setIsAddModalOpen(false);
        } else {
          setModalError(res.error?.message || 'Failed to create student record.');
        }
      }
    } catch {
      setModalError('An unexpected network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdmissionConfirm = async (notes?: string) => {
    if (!selectedStudentForAdmission || !admissionModalType) return;
    setIsSubmitting(true);
    setModalError(null);

    try {
      let res;
      if (admissionModalType === 'admit') {
        res = await admitStudent(selectedStudentForAdmission.id, { admissionDate: new Date().toISOString().split('T')[0] });
      } else if (admissionModalType === 'reject') {
        res = await rejectStudent(selectedStudentForAdmission.id);
      } else {
        res = await cancelStudentAdmission(selectedStudentForAdmission.id);
      }

      if (res.success) {
        setSuccessMessage(`Admission status updated for ${selectedStudentForAdmission.firstName}.`);
        setSelectedStudentForAdmission(null);
        setAdmissionModalType(null);
      } else {
        setModalError(res.error?.message || 'Failed to update admission status.');
      }
    } catch {
      setModalError('An unexpected error occurred during admission update.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLifecycleConfirm = async () => {
    if (!selectedStudentForLifecycle || !lifecycleModalType) return;
    setIsSubmitting(true);
    setModalError(null);

    try {
      let res;
      if (lifecycleModalType === 'activate') {
        res = await activateStudent(selectedStudentForLifecycle.id);
      } else if (lifecycleModalType === 'deactivate') {
        res = await deactivateStudent(selectedStudentForLifecycle.id);
      } else {
        res = await archiveStudent(selectedStudentForLifecycle.id);
      }

      if (res.success) {
        setSuccessMessage(`Status updated for ${selectedStudentForLifecycle.firstName}.`);
        setSelectedStudentForLifecycle(null);
        setLifecycleModalType(null);
      } else {
        setModalError(res.error?.message || 'Failed to update status.');
      }
    } catch {
      setModalError('An unexpected error occurred during lifecycle update.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isContextLoading) {
    return <StudentSkeleton />;
  }

  if (accessDenied) {
    return (
      <div className="p-6">
        <Alert variant="destructive" data-testid="student-access-denied">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied (403)</AlertTitle>
          <AlertDescription>
            You do not have permission (<code className="font-mono text-xs">student:read</code>) to view the student directory.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="students-workspace">
      {/* Header */}
      <StudentHeader
        canCreate={canCreate}
        onAddStudentClick={() => {
          setSelectedStudentForEdit(null);
          setIsAddModalOpen(true);
        }}
      />

      {/* Global Alerts */}
      {successMessage && (
        <Alert variant="default" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription className="text-xs">{successMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Operational Table */}
      <StudentOperationalTable
        canUpdate={canUpdate}
        canArchive={canArchive}
        onViewDetails={(s) => setSelectedStudentForDetails(rowToDto(s))}
        onEdit={(s) => {
          setSelectedStudentForEdit(rowToDto(s));
          setModalError(null);
        }}
        onAdmit={(s) => {
          setSelectedStudentForAdmission(rowToDto(s));
          setAdmissionModalType('admit');
          setModalError(null);
        }}
        onReject={(s) => {
          setSelectedStudentForAdmission(rowToDto(s));
          setAdmissionModalType('reject');
          setModalError(null);
        }}
        onCancel={(s) => {
          setSelectedStudentForAdmission(rowToDto(s));
          setAdmissionModalType('cancel');
          setModalError(null);
        }}
        onActivate={(s) => {
          setSelectedStudentForLifecycle(rowToDto(s));
          setLifecycleModalType('activate');
          setModalError(null);
        }}
        onDeactivate={(s) => {
          setSelectedStudentForLifecycle(rowToDto(s));
          setLifecycleModalType('deactivate');
          setModalError(null);
        }}
        onArchive={(s) => {
          setSelectedStudentForLifecycle(rowToDto(s));
          setLifecycleModalType('archive');
          setModalError(null);
        }}
      />

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

export function StudentContent() {
  return (
    <Suspense fallback={<StudentSkeleton />}>
      <StudentContentInner />
    </Suspense>
  );
}
