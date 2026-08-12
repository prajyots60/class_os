'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription, Button } from '@coaching-os/ui';
import { ShieldAlert, AlertCircle, RefreshCw, BookOpen, Layers, Users, Book } from 'lucide-react';
import { getCapabilitiesForRole, type ProgramDTO, type SubjectDTO, type ProgramSubjectDTO, type BatchDTO } from '@coaching-os/identity/client';

import type {
  StaffMemberDTO,
  CreateProgramFormValues,
  EditProgramFormValues,
  CreateSubjectFormValues,
  EditSubjectFormValues,
  CreateBatchFormValues,
  EditBatchFormValues,
  ChangeBatchStatusFormValues,
} from '../types/academic-ui.types';
import {
  fetchProgramsList,
  createProgram,
  updateProgram,
  archiveProgram,
  fetchSubjectsList,
  createSubject,
  updateSubject,
  archiveSubject,
  fetchProgramSubjectsList,
  createProgramSubject,
  deleteProgramSubject,
  fetchBatchesList,
  createBatch,
  updateBatch,
  assignBatchTeacher,
  changeBatchStatus,
  archiveBatch,
  fetchStaffList,
} from '../api/academic-api';

import { ProgramsView } from './ProgramsView';
import { ProgramFormModal } from './ProgramFormModal';
import { ProgramDetailsModal } from './ProgramDetailsModal';
import { SubjectsView } from './SubjectsView';
import { SubjectFormModal } from './SubjectFormModal';
import { SubjectDetailsModal } from './SubjectDetailsModal';
import { ProgramSubjectMappingView } from './ProgramSubjectMappingView';
import { ProgramSubjectFormModal } from './ProgramSubjectFormModal';
import { BatchesView } from './BatchesView';
import { BatchFormModal } from './BatchFormModal';
import { BatchTeacherModal } from './BatchTeacherModal';
import { BatchStatusModal } from './BatchStatusModal';
import { BatchDetailsModal } from './BatchDetailsModal';
import { ConfirmArchiveModal } from './ConfirmArchiveModal';

export function AcademicWorkspace() {
  const router = useRouter();

  // Active Tab: 'programs' | 'subjects' | 'mappings' | 'batches'
  const [activeTab, setActiveTab] = useState<'programs' | 'subjects' | 'mappings' | 'batches'>('programs');

  // Tenant & Capability State
  const [userCapabilities, setUserCapabilities] = useState<string[]>([]);
  const [isContextLoading, setIsContextLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // Entities Data State
  const [programs, setPrograms] = useState<ProgramDTO[]>([]);
  const [subjects, setSubjects] = useState<SubjectDTO[]>([]);
  const [mappings, setMappings] = useState<ProgramSubjectDTO[]>([]);
  const [batches, setBatches] = useState<BatchDTO[]>([]);
  const [staff, setStaff] = useState<StaffMemberDTO[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals & Active Operation States
  const [isProgramFormOpen, setIsProgramFormOpen] = useState(false);
  const [selectedProgramForEdit, setSelectedProgramForEdit] = useState<ProgramDTO | null>(null);
  const [selectedProgramForDetails, setSelectedProgramForDetails] = useState<ProgramDTO | null>(null);

  const [isSubjectFormOpen, setIsSubjectFormOpen] = useState(false);
  const [selectedSubjectForEdit, setSelectedSubjectForEdit] = useState<SubjectDTO | null>(null);
  const [selectedSubjectForDetails, setSelectedSubjectForDetails] = useState<SubjectDTO | null>(null);

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [preselectedProgramIdForMap, setPreselectedProgramIdForMap] = useState<string | undefined>(undefined);

  const [isBatchFormOpen, setIsBatchFormOpen] = useState(false);
  const [selectedBatchForEdit, setSelectedBatchForEdit] = useState<BatchDTO | null>(null);
  const [selectedBatchForTeacher, setSelectedBatchForTeacher] = useState<BatchDTO | null>(null);
  const [selectedBatchForStatus, setSelectedBatchForStatus] = useState<BatchDTO | null>(null);
  const [selectedBatchForDetails, setSelectedBatchForDetails] = useState<BatchDTO | null>(null);

  const [archiveTarget, setArchiveTarget] = useState<{
    type: 'program' | 'subject' | 'batch';
    entity: ProgramDTO | SubjectDTO | BatchDTO;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Capabilities
  const canProgramRead = userCapabilities.includes('program:read');
  const canProgramCreate = userCapabilities.includes('program:create');
  const canProgramUpdate = userCapabilities.includes('program:update');
  const canProgramArchive = userCapabilities.includes('program:archive');

  const canSubjectRead = userCapabilities.includes('subject:read');
  const canSubjectCreate = userCapabilities.includes('subject:create');
  const canSubjectUpdate = userCapabilities.includes('subject:update');
  const canSubjectArchive = userCapabilities.includes('subject:archive');

  const canBatchRead = userCapabilities.includes('batch:read');
  const canBatchCreate = userCapabilities.includes('batch:create');
  const canBatchUpdate = userCapabilities.includes('batch:update');
  const canBatchTeacher = userCapabilities.includes('batch:teacher');
  const canBatchStatus = userCapabilities.includes('batch:status');
  const canBatchArchive = userCapabilities.includes('batch:archive');

  const hasAnyAcademicAccess = canProgramRead || canSubjectRead || canBatchRead;

  // 1. Context Resolution
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
          const capSet = getCapabilitiesForRole(data.tenantContext.role);
          const caps = Array.from(capSet) as string[];
          setUserCapabilities(caps);
          const hasAccess = caps.some((c) =>
            ['program:read', 'subject:read', 'batch:read'].includes(c),
          );
          if (!hasAccess) {
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

  // 2. Fetch Data
  const loadAllAcademicData = useCallback(async () => {
    if (isContextLoading || accessDenied || !hasAnyAcademicAccess) return;
    setIsLoading(true);
    setError(null);

    const [progRes, subRes, mapRes, batchRes, staffRes] = await Promise.all([
      canProgramRead ? fetchProgramsList() : Promise.resolve({ success: true, data: [] }),
      canSubjectRead ? fetchSubjectsList() : Promise.resolve({ success: true, data: [] }),
      canProgramRead || canSubjectRead ? fetchProgramSubjectsList() : Promise.resolve({ success: true, data: [] }),
      canBatchRead ? fetchBatchesList() : Promise.resolve({ success: true, data: [] }),
      fetchStaffList(),
    ]);

    if (progRes.success) setPrograms(progRes.data || []);
    if (subRes.success) setSubjects(subRes.data || []);
    if (mapRes.success) setMappings(mapRes.data || []);
    if (batchRes.success) setBatches(batchRes.data || []);
    if (staffRes.success) setStaff(staffRes.data || []);

    if (!progRes.success || !subRes.success || !mapRes.success || !batchRes.success) {
      setError('Some academic data could not be loaded. Check your permissions.');
    }

    setIsLoading(false);
  }, [isContextLoading, accessDenied, hasAnyAcademicAccess, canProgramRead, canSubjectRead, canBatchRead]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadAllAcademicData();
    });
    return () => {
      active = false;
    };
  }, [loadAllAcademicData]);

  // Notification Auto-dismiss
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handler: Program Save / Edit
  const handleProgramSubmit = async (values: CreateProgramFormValues | EditProgramFormValues) => {
    setIsSubmitting(true);
    setModalError(null);

    if (selectedProgramForEdit) {
      const res = await updateProgram(selectedProgramForEdit.id, values as EditProgramFormValues);
      if (res.success) {
        setSuccessMessage(`Updated program ${selectedProgramForEdit.code}.`);
        setSelectedProgramForEdit(null);
        await loadAllAcademicData();
      } else {
        setModalError(res.error?.message || 'Failed to update program.');
      }
    } else {
      const res = await createProgram(values as CreateProgramFormValues);
      if (res.success) {
        setSuccessMessage('Program created successfully.');
        setIsProgramFormOpen(false);
        await loadAllAcademicData();
      } else {
        setModalError(res.error?.message || 'Failed to create program.');
      }
    }

    setIsSubmitting(false);
  };

  // Handler: Subject Save / Edit
  const handleSubjectSubmit = async (values: CreateSubjectFormValues | EditSubjectFormValues) => {
    setIsSubmitting(true);
    setModalError(null);

    if (selectedSubjectForEdit) {
      const res = await updateSubject(selectedSubjectForEdit.id, values as EditSubjectFormValues);
      if (res.success) {
        setSuccessMessage(`Updated subject ${selectedSubjectForEdit.code}.`);
        setSelectedSubjectForEdit(null);
        await loadAllAcademicData();
      } else {
        setModalError(res.error?.message || 'Failed to update subject.');
      }
    } else {
      const res = await createSubject(values as CreateSubjectFormValues);
      if (res.success) {
        setSuccessMessage('Subject created successfully.');
        setIsSubjectFormOpen(false);
        await loadAllAcademicData();
      } else {
        setModalError(res.error?.message || 'Failed to create subject.');
      }
    }

    setIsSubmitting(false);
  };

  // Handler: ProgramSubject Map
  const handleMappingSubmit = async (values: { programId: string; subjectId: string }) => {
    setIsSubmitting(true);
    setModalError(null);

    const res = await createProgramSubject(values);
    if (res.success) {
      setSuccessMessage('Subject mapped to program successfully.');
      setIsMapModalOpen(false);
      await loadAllAcademicData();
    } else {
      setModalError(res.error?.message || 'Failed to map subject to program.');
    }

    setIsSubmitting(false);
  };

  // Handler: ProgramSubject Unmap
  const handleUnmap = async (programId: string, subjectId: string) => {
    const res = await deleteProgramSubject(programId, subjectId);
    if (res.success) {
      setSuccessMessage('Subject unmapped from program.');
      await loadAllAcademicData();
    } else {
      setError(res.error?.message || 'Failed to unmap subject.');
    }
  };

  // Handler: Batch Save / Edit
  const handleBatchSubmit = async (values: CreateBatchFormValues | EditBatchFormValues) => {
    setIsSubmitting(true);
    setModalError(null);

    if (selectedBatchForEdit) {
      const res = await updateBatch(selectedBatchForEdit.id, values as EditBatchFormValues);
      if (res.success) {
        setSuccessMessage(`Updated batch ${selectedBatchForEdit.code}.`);
        setSelectedBatchForEdit(null);
        await loadAllAcademicData();
      } else {
        setModalError(res.error?.message || 'Failed to update batch.');
      }
    } else {
      const res = await createBatch(values as CreateBatchFormValues);
      if (res.success) {
        setSuccessMessage('Batch created successfully.');
        setIsBatchFormOpen(false);
        await loadAllAcademicData();
      } else {
        setModalError(res.error?.message || 'Failed to create batch.');
      }
    }

    setIsSubmitting(false);
  };

  // Handler: Batch Teacher Assignment
  const handleTeacherSubmit = async (values: { teacherId: string | null }) => {
    if (!selectedBatchForTeacher) return;
    setIsSubmitting(true);
    setModalError(null);

    const res = await assignBatchTeacher(selectedBatchForTeacher.id, values);
    if (res.success) {
      setSuccessMessage(`Updated teacher assignment for batch ${selectedBatchForTeacher.code}.`);
      setSelectedBatchForTeacher(null);
      await loadAllAcademicData();
    } else {
      setModalError(res.error?.message || 'Failed to assign teacher.');
    }

    setIsSubmitting(false);
  };

  // Handler: Batch Status Transition
  const handleStatusSubmit = async (values: ChangeBatchStatusFormValues) => {
    if (!selectedBatchForStatus) return;
    setIsSubmitting(true);
    setModalError(null);

    const res = await changeBatchStatus(selectedBatchForStatus.id, values);
    if (res.success) {
      setSuccessMessage(`Transitioned batch ${selectedBatchForStatus.code} status to ${values.status}.`);
      setSelectedBatchForStatus(null);
      await loadAllAcademicData();
    } else {
      setModalError(res.error?.message || 'Failed to transition status.');
    }

    setIsSubmitting(false);
  };

  // Handler: Archive Confirm
  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsSubmitting(true);
    setModalError(null);

    let res;
    if (archiveTarget.type === 'program') {
      res = await archiveProgram(archiveTarget.entity.id);
    } else if (archiveTarget.type === 'subject') {
      res = await archiveSubject(archiveTarget.entity.id);
    } else {
      res = await archiveBatch(archiveTarget.entity.id);
    }

    if (res.success) {
      setSuccessMessage(`Archived ${archiveTarget.type} ${archiveTarget.entity.code}.`);
      setArchiveTarget(null);
      await loadAllAcademicData();
    } else {
      setModalError(res.error?.message || `Failed to archive ${archiveTarget.type}.`);
    }

    setIsSubmitting(false);
  };

  if (isContextLoading) {
    return (
      <div className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))]" data-testid="academic-context-loading">
        Loading Academic Workspace context...
      </div>
    );
  }

  if (accessDenied || !hasAnyAcademicAccess) {
    return (
      <div className="p-6" data-testid="academic-access-denied">
        <Alert variant="destructive">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have required academic permissions to access the Academic Hierarchy Workspace.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="academic-content">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-5">
        <div>
          <h1 className="text-xl font-bold text-[hsl(var(--foreground))] tracking-tight">
            Academic Hierarchy Workspace
          </h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Manage Programs, Subjects, Subject-Program Mappings, and Batches.
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-1 bg-[hsl(var(--muted)/0.4)] p-1 rounded-xl border border-[hsl(var(--border))] shrink-0">
          {canProgramRead && (
            <button
              onClick={() => setActiveTab('programs')}
              data-testid="tab-programs"
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'programs'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm font-semibold'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" /> Programs ({programs.length})
            </button>
          )}

          {canSubjectRead && (
            <button
              onClick={() => setActiveTab('subjects')}
              data-testid="tab-subjects"
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'subjects'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm font-semibold'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <Book className="h-3.5 w-3.5" /> Subjects ({subjects.length})
            </button>
          )}

          {(canProgramRead || canSubjectRead) && (
            <button
              onClick={() => setActiveTab('mappings')}
              data-testid="tab-mappings"
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'mappings'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm font-semibold'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <Layers className="h-3.5 w-3.5" /> Mappings ({mappings.length})
            </button>
          )}

          {canBatchRead && (
            <button
              onClick={() => setActiveTab('batches')}
              data-testid="tab-batches"
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'batches'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm font-semibold'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <Users className="h-3.5 w-3.5" /> Batches ({batches.length})
            </button>
          )}
        </div>
      </div>

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
            <Button variant="outline" size="sm" onClick={() => loadAllAcademicData()} className="h-7 px-2 gap-1 text-xs">
              <RefreshCw className="h-3 w-3" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Active Tab View Rendering */}
      {activeTab === 'programs' && canProgramRead && (
        <ProgramsView
          programs={programs}
          isLoading={isLoading}
          canCreate={canProgramCreate}
          canUpdate={canProgramUpdate}
          canArchive={canProgramArchive}
          onAddProgram={() => {
            setSelectedProgramForEdit(null);
            setModalError(null);
            setIsProgramFormOpen(true);
          }}
          onViewProgram={(p) => setSelectedProgramForDetails(p)}
          onEditProgram={(p) => {
            setSelectedProgramForEdit(p);
            setModalError(null);
          }}
          onArchiveProgram={(p) => {
            setArchiveTarget({ type: 'program', entity: p });
            setModalError(null);
          }}
        />
      )}

      {activeTab === 'subjects' && canSubjectRead && (
        <SubjectsView
          subjects={subjects}
          isLoading={isLoading}
          canCreate={canSubjectCreate}
          canUpdate={canSubjectUpdate}
          canArchive={canSubjectArchive}
          onAddSubject={() => {
            setSelectedSubjectForEdit(null);
            setModalError(null);
            setIsSubjectFormOpen(true);
          }}
          onViewSubject={(s) => setSelectedSubjectForDetails(s)}
          onEditSubject={(s) => {
            setSelectedSubjectForEdit(s);
            setModalError(null);
          }}
          onArchiveSubject={(s) => {
            setArchiveTarget({ type: 'subject', entity: s });
            setModalError(null);
          }}
        />
      )}

      {activeTab === 'mappings' && (canProgramRead || canSubjectRead) && (
        <ProgramSubjectMappingView
          programs={programs}
          subjects={subjects}
          mappings={mappings}
          isLoading={isLoading}
          canCreate={canProgramCreate || canSubjectCreate}
          canArchive={canProgramArchive || canSubjectArchive}
          onOpenMapModal={(preId) => {
            setPreselectedProgramIdForMap(preId);
            setModalError(null);
            setIsMapModalOpen(true);
          }}
          onUnmapSubject={handleUnmap}
        />
      )}

      {activeTab === 'batches' && canBatchRead && (
        <BatchesView
          batches={batches}
          programs={programs}
          subjects={subjects}
          staff={staff}
          isLoading={isLoading}
          canCreate={canBatchCreate}
          canUpdate={canBatchUpdate}
          canTeacher={canBatchTeacher}
          canStatus={canBatchStatus}
          canArchive={canBatchArchive}
          onAddBatch={() => {
            setSelectedBatchForEdit(null);
            setModalError(null);
            setIsBatchFormOpen(true);
          }}
          onViewBatch={(b) => setSelectedBatchForDetails(b)}
          onEditBatch={(b) => {
            setSelectedBatchForEdit(b);
            setModalError(null);
          }}
          onAssignTeacher={(b) => {
            setSelectedBatchForTeacher(b);
            setModalError(null);
          }}
          onChangeStatus={(b) => {
            setSelectedBatchForStatus(b);
            setModalError(null);
          }}
          onArchiveBatch={(b) => {
            setArchiveTarget({ type: 'batch', entity: b });
            setModalError(null);
          }}
        />
      )}

      {/* Program Modals */}
      <ProgramFormModal
        isOpen={isProgramFormOpen || !!selectedProgramForEdit}
        onClose={() => {
          setIsProgramFormOpen(false);
          setSelectedProgramForEdit(null);
          setModalError(null);
        }}
        onSubmit={handleProgramSubmit}
        program={selectedProgramForEdit}
        isSubmitting={isSubmitting}
        serverError={modalError}
      />

      <ProgramDetailsModal
        isOpen={!!selectedProgramForDetails}
        onClose={() => setSelectedProgramForDetails(null)}
        program={selectedProgramForDetails}
        mappedSubjects={
          selectedProgramForDetails
            ? subjects.filter((s) =>
                mappings.some((m) => m.programId === selectedProgramForDetails.id && m.subjectId === s.id),
              )
            : []
        }
      />

      {/* Subject Modals */}
      <SubjectFormModal
        isOpen={isSubjectFormOpen || !!selectedSubjectForEdit}
        onClose={() => {
          setIsSubjectFormOpen(false);
          setSelectedSubjectForEdit(null);
          setModalError(null);
        }}
        onSubmit={handleSubjectSubmit}
        subject={selectedSubjectForEdit}
        isSubmitting={isSubmitting}
        serverError={modalError}
      />

      <SubjectDetailsModal
        isOpen={!!selectedSubjectForDetails}
        onClose={() => setSelectedSubjectForDetails(null)}
        subject={selectedSubjectForDetails}
        programsUsingSubject={
          selectedSubjectForDetails
            ? programs.filter((p) =>
                mappings.some((m) => m.subjectId === selectedSubjectForDetails.id && m.programId === p.id),
              )
            : []
        }
      />

      {/* Mapping Modal */}
      <ProgramSubjectFormModal
        isOpen={isMapModalOpen}
        onClose={() => {
          setIsMapModalOpen(false);
          setModalError(null);
        }}
        onSubmit={handleMappingSubmit}
        programs={programs}
        subjects={subjects}
        preselectedProgramId={preselectedProgramIdForMap}
        isSubmitting={isSubmitting}
        serverError={modalError}
      />

      {/* Batch Modals */}
      <BatchFormModal
        isOpen={isBatchFormOpen || !!selectedBatchForEdit}
        onClose={() => {
          setIsBatchFormOpen(false);
          setSelectedBatchForEdit(null);
          setModalError(null);
        }}
        onSubmit={handleBatchSubmit}
        batch={selectedBatchForEdit}
        programs={programs}
        subjects={subjects}
        staff={staff}
        isSubmitting={isSubmitting}
        serverError={modalError}
      />

      <BatchTeacherModal
        isOpen={!!selectedBatchForTeacher}
        onClose={() => {
          setSelectedBatchForTeacher(null);
          setModalError(null);
        }}
        onSubmit={handleTeacherSubmit}
        batch={selectedBatchForTeacher}
        staff={staff}
        isSubmitting={isSubmitting}
        serverError={modalError}
      />

      <BatchStatusModal
        isOpen={!!selectedBatchForStatus}
        onClose={() => {
          setSelectedBatchForStatus(null);
          setModalError(null);
        }}
        onSubmit={handleStatusSubmit}
        batch={selectedBatchForStatus}
        isSubmitting={isSubmitting}
        serverError={modalError}
      />

      <BatchDetailsModal
        isOpen={!!selectedBatchForDetails}
        onClose={() => setSelectedBatchForDetails(null)}
        batch={selectedBatchForDetails}
        subject={selectedBatchForDetails ? subjects.find((s) => s.id === selectedBatchForDetails.subjectId) : null}
        program={selectedBatchForDetails && selectedBatchForDetails.programId ? programs.find((p) => p.id === selectedBatchForDetails.programId) : null}
      />

      {/* Archive Modal */}
      <ConfirmArchiveModal
        isOpen={!!archiveTarget}
        onClose={() => {
          setArchiveTarget(null);
          setModalError(null);
        }}
        onConfirm={handleArchiveConfirm}
        title={`Archive ${archiveTarget?.type === 'program' ? 'Program' : archiveTarget?.type === 'subject' ? 'Subject' : 'Batch'}`}
        description={`Are you sure you want to archive ${archiveTarget?.entity.code} (${archiveTarget?.entity.name})? This action soft-deletes the record.`}
        isSubmitting={isSubmitting}
        error={modalError}
      />
    </div>
  );
}
