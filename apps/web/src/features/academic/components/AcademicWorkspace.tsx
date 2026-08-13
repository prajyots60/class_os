'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription } from '@coaching-os/ui';
import { ShieldAlert, AlertCircle, RefreshCw, Calendar, CheckSquare, FileText, ClipboardList, BookOpen } from 'lucide-react';
import { getCapabilitiesForRole, type ProgramDTO, type SubjectDTO, type ProgramSubjectDTO, type BatchDTO } from '@coaching-os/identity/client';

import type {
  StaffMemberDTO,
  CreateProgramFormValues,
  EditProgramFormValues,
  CreateSubjectFormValues,
  EditSubjectFormValues,
  CreateProgramSubjectFormValues,
  CreateBatchFormValues,
  EditBatchFormValues,
  AssignTeacherFormValues,
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

import { AcademicOverviewView } from './AcademicOverviewView';
import { SessionsView } from './SessionsView';
import { AttendanceView } from './AttendanceView';
import { HomeworkView } from './HomeworkView';
import { AssessmentsView } from './AssessmentsView';

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

export type WorkspaceTab = 'today' | 'sessions' | 'attendance' | 'homework' | 'tests' | 'hierarchy';
export type HierarchySubTab = 'programs' | 'subjects' | 'mappings' | 'batches';

function AcademicWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active Main Tab initialized directly from searchParams
  const [mainTab, setMainTab] = useState<WorkspaceTab>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['today', 'sessions', 'attendance', 'homework', 'tests', 'hierarchy'].includes(tabParam)) {
      return tabParam as WorkspaceTab;
    }
    return 'today';
  });
  const [hierarchySubTab, setHierarchySubTab] = useState<HierarchySubTab>('programs');

  // Contextual params passed across tabs
  const [navContext, setNavContext] = useState<{ sessionId?: string; batchId?: string }>({});

  // Tenant & Capability State
  const [userCapabilities, setUserCapabilities] = useState<string[]>([]);
  const [isContextLoading, setIsContextLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // Entities Data State for Hierarchy
  const [programs, setPrograms] = useState<ProgramDTO[]>([]);
  const [subjects, setSubjects] = useState<SubjectDTO[]>([]);
  const [mappings, setMappings] = useState<ProgramSubjectDTO[]>([]);
  const [batches, setBatches] = useState<BatchDTO[]>([]);
  const [staff, setStaff] = useState<StaffMemberDTO[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals & Active Operation States for Hierarchy
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
  const canProgramCreate = userCapabilities.includes('program:create') || userCapabilities.includes('academic:write');
  const canProgramUpdate = userCapabilities.includes('program:update') || userCapabilities.includes('academic:write');
  const canProgramArchive = userCapabilities.includes('program:archive') || userCapabilities.includes('academic:write');

  const canSubjectCreate = userCapabilities.includes('subject:create') || userCapabilities.includes('academic:write');
  const canSubjectUpdate = userCapabilities.includes('subject:update') || userCapabilities.includes('academic:write');
  const canSubjectArchive = userCapabilities.includes('subject:archive') || userCapabilities.includes('academic:write');

  const canBatchCreate = userCapabilities.includes('batch:create') || userCapabilities.includes('academic:write');
  const canBatchUpdate = userCapabilities.includes('batch:update') || userCapabilities.includes('academic:write');
  const canBatchTeacher = userCapabilities.includes('batch:teacher') || userCapabilities.includes('academic:write');
  const canBatchStatus = userCapabilities.includes('batch:status') || userCapabilities.includes('academic:write');
  const canBatchArchive = userCapabilities.includes('batch:archive') || userCapabilities.includes('academic:write');

  const hasMutationCapability = userCapabilities.includes('academic:write') || canProgramCreate || canBatchCreate;

  // Context Resolution
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

  // Fetch Hierarchy Data
  const loadAllAcademicData = useCallback(async () => {
    if (isContextLoading || accessDenied) return;
    setIsLoading(true);
    setError(null);

    const [progRes, subRes, mapRes, batchRes, staffRes] = await Promise.all([
      fetchProgramsList(),
      fetchSubjectsList(),
      fetchProgramSubjectsList(),
      fetchBatchesList(),
      fetchStaffList(),
    ]);

    if (progRes.success) setPrograms(progRes.data || []);
    if (subRes.success) setSubjects(subRes.data || []);
    if (mapRes.success) setMappings(mapRes.data || []);
    if (batchRes.success) setBatches(batchRes.data || []);
    if (staffRes.success) setStaff(staffRes.data || []);

    setIsLoading(false);
  }, [isContextLoading, accessDenied]);

  useEffect(() => {
    let mounted = true;
    async function initData() {
      if (isContextLoading || accessDenied) return;
      setIsLoading(true);
      setError(null);

      const [progRes, subRes, mapRes, batchRes, staffRes] = await Promise.all([
        fetchProgramsList(),
        fetchSubjectsList(),
        fetchProgramSubjectsList(),
        fetchBatchesList(),
        fetchStaffList(),
      ]);

      if (mounted) {
        if (progRes.success) setPrograms(progRes.data || []);
        if (subRes.success) setSubjects(subRes.data || []);
        if (mapRes.success) setMappings(mapRes.data || []);
        if (batchRes.success) setBatches(batchRes.data || []);
        if (staffRes.success) setStaff(staffRes.data || []);
        setIsLoading(false);
      }
    }

    initData();
    return () => {
      mounted = false;
    };
  }, [isContextLoading, accessDenied]);

  // Tab switch helper
  const handleNavigateToTab = (tab: WorkspaceTab, context?: { sessionId?: string; batchId?: string }) => {
    if (context) setNavContext(context);
    setMainTab(tab);
  };

  // Hierarchy Handlers
  const handleCreateProgramSubmit = async (values: CreateProgramFormValues | EditProgramFormValues) => {
    setIsSubmitting(true);
    setModalError(null);
    const res = await createProgram(values as CreateProgramFormValues);
    setIsSubmitting(false);
    if (!res.success) {
      setModalError(res.error?.message || 'Failed to create program.');
    } else {
      setIsProgramFormOpen(false);
      setSuccessMessage('Program created successfully.');
      loadAllAcademicData();
    }
  };

  const handleUpdateProgramSubmit = async (values: CreateProgramFormValues | EditProgramFormValues) => {
    if (!selectedProgramForEdit) return;
    setIsSubmitting(true);
    setModalError(null);
    const res = await updateProgram(selectedProgramForEdit.id, values as EditProgramFormValues);
    setIsSubmitting(false);
    if (!res.success) {
      setModalError(res.error?.message || 'Failed to update program.');
    } else {
      setSelectedProgramForEdit(null);
      setSuccessMessage('Program updated successfully.');
      loadAllAcademicData();
    }
  };

  const handleCreateSubjectSubmit = async (values: CreateSubjectFormValues | EditSubjectFormValues) => {
    setIsSubmitting(true);
    setModalError(null);
    const res = await createSubject(values as CreateSubjectFormValues);
    setIsSubmitting(false);
    if (!res.success) {
      setModalError(res.error?.message || 'Failed to create subject.');
    } else {
      setIsSubjectFormOpen(false);
      setSuccessMessage('Subject created successfully.');
      loadAllAcademicData();
    }
  };

  const handleUpdateSubjectSubmit = async (values: CreateSubjectFormValues | EditSubjectFormValues) => {
    if (!selectedSubjectForEdit) return;
    setIsSubmitting(true);
    setModalError(null);
    const res = await updateSubject(selectedSubjectForEdit.id, values as EditSubjectFormValues);
    setIsSubmitting(false);
    if (!res.success) {
      setModalError(res.error?.message || 'Failed to update subject.');
    } else {
      setSelectedSubjectForEdit(null);
      setSuccessMessage('Subject updated successfully.');
      loadAllAcademicData();
    }
  };

  const handleCreateProgramSubjectSubmit = async (values: CreateProgramSubjectFormValues) => {
    setIsSubmitting(true);
    setModalError(null);
    const res = await createProgramSubject(values);
    setIsSubmitting(false);
    if (!res.success) {
      setModalError(res.error?.message || 'Failed to map subject to program.');
    } else {
      setIsMapModalOpen(false);
      setPreselectedProgramIdForMap(undefined);
      setSuccessMessage('Subject mapped to program successfully.');
      loadAllAcademicData();
    }
  };

  const handleDeleteProgramSubject = async (programId: string, subjectId: string) => {
    setIsLoading(true);
    const res = await deleteProgramSubject(programId, subjectId);
    if (!res.success) {
      setError(res.error?.message || 'Failed to unmap subject.');
    } else {
      setSuccessMessage('Subject unmapped successfully.');
      loadAllAcademicData();
    }
  };

  const handleCreateBatchSubmit = async (values: CreateBatchFormValues | EditBatchFormValues) => {
    setIsSubmitting(true);
    setModalError(null);
    const res = await createBatch(values as CreateBatchFormValues);
    setIsSubmitting(false);
    if (!res.success) {
      setModalError(res.error?.message || 'Failed to create batch.');
    } else {
      setIsBatchFormOpen(false);
      setSuccessMessage('Batch created successfully.');
      loadAllAcademicData();
    }
  };

  const handleUpdateBatchSubmit = async (values: CreateBatchFormValues | EditBatchFormValues) => {
    if (!selectedBatchForEdit) return;
    setIsSubmitting(true);
    setModalError(null);
    const res = await updateBatch(selectedBatchForEdit.id, values as EditBatchFormValues);
    setIsSubmitting(false);
    if (!res.success) {
      setModalError(res.error?.message || 'Failed to update batch.');
    } else {
      setSelectedBatchForEdit(null);
      setSuccessMessage('Batch updated successfully.');
      loadAllAcademicData();
    }
  };

  const handleAssignTeacherSubmit = async (values: AssignTeacherFormValues) => {
    if (!selectedBatchForTeacher) return;
    setIsSubmitting(true);
    setModalError(null);
    const res = await assignBatchTeacher(selectedBatchForTeacher.id, values);
    setIsSubmitting(false);
    if (!res.success) {
      setModalError(res.error?.message || 'Failed to assign teacher.');
    } else {
      setSelectedBatchForTeacher(null);
      setSuccessMessage('Teacher assignment updated.');
      loadAllAcademicData();
    }
  };

  const handleChangeStatusSubmit = async (values: ChangeBatchStatusFormValues) => {
    if (!selectedBatchForStatus) return;
    setIsSubmitting(true);
    setModalError(null);
    const res = await changeBatchStatus(selectedBatchForStatus.id, values);
    setIsSubmitting(false);
    if (!res.success) {
      setModalError(res.error?.message || 'Failed to change batch status.');
    } else {
      setSelectedBatchForStatus(null);
      setSuccessMessage('Batch status updated.');
      loadAllAcademicData();
    }
  };

  const handleConfirmArchive = async () => {
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

    setIsSubmitting(false);
    if (!res.success) {
      setModalError(res.error?.message || `Failed to archive ${archiveTarget.type}.`);
    } else {
      setArchiveTarget(null);
      setSuccessMessage(`${archiveTarget.type.toUpperCase()} archived successfully.`);
      loadAllAcademicData();
    }
  };

  if (isContextLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Verifying staff permissions...</span>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Alert variant="destructive">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            You do not have active staff membership permissions to access the Staff Academic Workspace.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Workspace Title & Top Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Staff Academic Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Daily offline coaching operations engine for schedules, sessions, attendance, homework, and assessments.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Main Tab Navigation Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => handleNavigateToTab('today')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            mainTab === 'today'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Today&apos;s Work
        </button>

        <button
          type="button"
          onClick={() => handleNavigateToTab('sessions')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            mainTab === 'sessions'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Sessions &amp; Schedules
        </button>

        <button
          type="button"
          onClick={() => handleNavigateToTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            mainTab === 'attendance'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          Attendance
        </button>

        <button
          type="button"
          onClick={() => handleNavigateToTab('homework')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            mainTab === 'homework'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          Homework
        </button>

        <button
          type="button"
          onClick={() => handleNavigateToTab('tests')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            mainTab === 'tests'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Assessments &amp; Marks
        </button>

        <button
          type="button"
          onClick={() => handleNavigateToTab('hierarchy')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            mainTab === 'hierarchy'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Programs &amp; Batches
        </button>
      </div>

      {/* Main Tab Views */}
      {mainTab === 'today' && (
        <AcademicOverviewView
          onNavigateToTab={handleNavigateToTab}
          hasMutationCapability={hasMutationCapability}
        />
      )}

      {mainTab === 'sessions' && (
        <SessionsView
          initialBatchId={navContext.batchId}
          hasMutationCapability={hasMutationCapability}
          onNavigateToAttendance={(sessionId, batchId) =>
            handleNavigateToTab('attendance', { sessionId, batchId })
          }
        />
      )}

      {mainTab === 'attendance' && (
        <AttendanceView
          initialSessionId={navContext.sessionId}
          initialBatchId={navContext.batchId}
          hasMutationCapability={hasMutationCapability}
        />
      )}

      {mainTab === 'homework' && (
        <HomeworkView
          initialBatchId={navContext.batchId}
          hasMutationCapability={hasMutationCapability}
        />
      )}

      {mainTab === 'tests' && (
        <AssessmentsView
          initialBatchId={navContext.batchId}
          hasMutationCapability={hasMutationCapability}
        />
      )}

      {mainTab === 'hierarchy' && (
        <div className="space-y-6">
          {/* Sub-tab Navigation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHierarchySubTab('programs')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                hierarchySubTab === 'programs'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Programs ({programs.length})
            </button>
            <button
              type="button"
              onClick={() => setHierarchySubTab('subjects')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                hierarchySubTab === 'subjects'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Subjects ({subjects.length})
            </button>
            <button
              type="button"
              onClick={() => setHierarchySubTab('mappings')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                hierarchySubTab === 'mappings'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Program-Subject Mappings ({mappings.length})
            </button>
            <button
              type="button"
              onClick={() => setHierarchySubTab('batches')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                hierarchySubTab === 'batches'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Batches ({batches.length})
            </button>
          </div>

          {hierarchySubTab === 'programs' && (
            <ProgramsView
              programs={programs}
              isLoading={isLoading}
              canCreate={canProgramCreate}
              canUpdate={canProgramUpdate}
              canArchive={canProgramArchive}
              onAddProgram={() => setIsProgramFormOpen(true)}
              onViewProgram={(p) => setSelectedProgramForDetails(p)}
              onEditProgram={(p) => setSelectedProgramForEdit(p)}
              onArchiveProgram={(p) => setArchiveTarget({ type: 'program', entity: p })}
            />
          )}

          {hierarchySubTab === 'subjects' && (
            <SubjectsView
              subjects={subjects}
              isLoading={isLoading}
              canCreate={canSubjectCreate}
              canUpdate={canSubjectUpdate}
              canArchive={canSubjectArchive}
              onAddSubject={() => setIsSubjectFormOpen(true)}
              onViewSubject={(s) => setSelectedSubjectForDetails(s)}
              onEditSubject={(s) => setSelectedSubjectForEdit(s)}
              onArchiveSubject={(s) => setArchiveTarget({ type: 'subject', entity: s })}
            />
          )}

          {hierarchySubTab === 'mappings' && (
            <ProgramSubjectMappingView
              mappings={mappings}
              programs={programs}
              subjects={subjects}
              isLoading={isLoading}
              canCreate={canProgramUpdate}
              canArchive={canProgramUpdate}
              onOpenMapModal={() => setIsMapModalOpen(true)}
              onUnmapSubject={handleDeleteProgramSubject}
            />
          )}

          {hierarchySubTab === 'batches' && (
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
              onAddBatch={() => setIsBatchFormOpen(true)}
              onViewBatch={(b) => setSelectedBatchForDetails(b)}
              onEditBatch={(b) => setSelectedBatchForEdit(b)}
              onAssignTeacher={(b) => setSelectedBatchForTeacher(b)}
              onChangeStatus={(b) => setSelectedBatchForStatus(b)}
              onArchiveBatch={(b) => setArchiveTarget({ type: 'batch', entity: b })}
            />
          )}
        </div>
      )}

      {/* Hierarchy Modals */}
      {isProgramFormOpen && (
        <ProgramFormModal
          isOpen={isProgramFormOpen}
          isSubmitting={isSubmitting}
          serverError={modalError}
          onClose={() => setIsProgramFormOpen(false)}
          onSubmit={handleCreateProgramSubmit}
        />
      )}

      {selectedProgramForEdit && (
        <ProgramFormModal
          isOpen={!!selectedProgramForEdit}
          program={selectedProgramForEdit}
          isSubmitting={isSubmitting}
          serverError={modalError}
          onClose={() => setSelectedProgramForEdit(null)}
          onSubmit={handleUpdateProgramSubmit}
        />
      )}

      {selectedProgramForDetails && (
        <ProgramDetailsModal
          isOpen={!!selectedProgramForDetails}
          program={selectedProgramForDetails}
          mappedSubjects={subjects.filter((s) =>
            mappings.some((m) => m.programId === selectedProgramForDetails.id && m.subjectId === s.id),
          )}
          onClose={() => setSelectedProgramForDetails(null)}
        />
      )}

      {isSubjectFormOpen && (
        <SubjectFormModal
          isOpen={isSubjectFormOpen}
          isSubmitting={isSubmitting}
          serverError={modalError}
          onClose={() => setIsSubjectFormOpen(false)}
          onSubmit={handleCreateSubjectSubmit}
        />
      )}

      {selectedSubjectForEdit && (
        <SubjectFormModal
          isOpen={!!selectedSubjectForEdit}
          subject={selectedSubjectForEdit}
          isSubmitting={isSubmitting}
          serverError={modalError}
          onClose={() => setSelectedSubjectForEdit(null)}
          onSubmit={handleUpdateSubjectSubmit}
        />
      )}

      {selectedSubjectForDetails && (
        <SubjectDetailsModal
          isOpen={!!selectedSubjectForDetails}
          subject={selectedSubjectForDetails}
          programsUsingSubject={programs.filter((p) =>
            mappings.some((m) => m.subjectId === selectedSubjectForDetails.id && m.programId === p.id),
          )}
          onClose={() => setSelectedSubjectForDetails(null)}
        />
      )}

      {isMapModalOpen && (
        <ProgramSubjectFormModal
          isOpen={isMapModalOpen}
          programs={programs}
          subjects={subjects}
          preselectedProgramId={preselectedProgramIdForMap}
          isSubmitting={isSubmitting}
          serverError={modalError}
          onClose={() => {
            setIsMapModalOpen(false);
            setPreselectedProgramIdForMap(undefined);
          }}
          onSubmit={handleCreateProgramSubjectSubmit}
        />
      )}

      {isBatchFormOpen && (
        <BatchFormModal
          isOpen={isBatchFormOpen}
          programs={programs}
          subjects={subjects}
          staff={staff}
          isSubmitting={isSubmitting}
          serverError={modalError}
          onClose={() => setIsBatchFormOpen(false)}
          onSubmit={handleCreateBatchSubmit}
        />
      )}

      {selectedBatchForEdit && (
        <BatchFormModal
          isOpen={!!selectedBatchForEdit}
          batch={selectedBatchForEdit}
          programs={programs}
          subjects={subjects}
          staff={staff}
          isSubmitting={isSubmitting}
          serverError={modalError}
          onClose={() => setSelectedBatchForEdit(null)}
          onSubmit={handleUpdateBatchSubmit}
        />
      )}

      {selectedBatchForTeacher && (
        <BatchTeacherModal
          isOpen={!!selectedBatchForTeacher}
          batch={selectedBatchForTeacher}
          staff={staff}
          isSubmitting={isSubmitting}
          serverError={modalError}
          onClose={() => setSelectedBatchForTeacher(null)}
          onSubmit={handleAssignTeacherSubmit}
        />
      )}

      {selectedBatchForStatus && (
        <BatchStatusModal
          isOpen={!!selectedBatchForStatus}
          batch={selectedBatchForStatus}
          isSubmitting={isSubmitting}
          serverError={modalError}
          onClose={() => setSelectedBatchForStatus(null)}
          onSubmit={handleChangeStatusSubmit}
        />
      )}

      {selectedBatchForDetails && (
        <BatchDetailsModal
          isOpen={!!selectedBatchForDetails}
          batch={selectedBatchForDetails}
          program={programs.find((p) => p.id === selectedBatchForDetails.programId)}
          subject={subjects.find((s) => s.id === selectedBatchForDetails.subjectId)}
          onClose={() => setSelectedBatchForDetails(null)}
        />
      )}

      {archiveTarget && (
        <ConfirmArchiveModal
          isOpen={!!archiveTarget}
          title={`Archive ${archiveTarget.type.toUpperCase()}`}
          description={`Are you sure you want to archive "${archiveTarget.entity.name}"? This action moves the record to archived state.`}
          confirmLabel={`Archive ${archiveTarget.type}`}
          isSubmitting={isSubmitting}
          error={modalError}
          onClose={() => setArchiveTarget(null)}
          onConfirm={handleConfirmArchive}
        />
      )}
    </div>
  );
}

export function AcademicWorkspace() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <AcademicWorkspaceContent />
    </Suspense>
  );
}
