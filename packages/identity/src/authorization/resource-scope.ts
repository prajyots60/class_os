import { AuthorizationError } from '@coaching-os/shared';
import { type Capability, CAPABILITIES } from './capabilities';
import { AuthorizationEngine } from './authorization-engine';
import type { TenantContext } from '../application/use-cases/membership.use-cases';

export interface StudentScopeRecord {
  id: string;
  instituteId: string;
}

export interface StudentBatchScopeRecord extends StudentScopeRecord {
  batchIds: readonly string[];
}

export interface BatchScopeRecord {
  id: string;
  instituteId: string;
}

export interface ParentResourceScope {
  linkedStudentIds: readonly string[];
}

export interface TeacherResourceScope {
  batchIds: readonly string[];
}

/**
 * Defensive check ensuring basic record integrity and tenant alignment.
 */
function isRecordTenantAligned(
  context: TenantContext,
  resourceInstituteId: string,
): boolean {
  if (!context || context.status !== 'active') {
    return false;
  }
  if (!context.instituteId || context.instituteId.trim() === '') {
    return false;
  }
  if (!resourceInstituteId || resourceInstituteId.trim() === '') {
    return false;
  }
  return context.instituteId === resourceInstituteId;
}

/**
 * Parent Resource Scope: Evaluates if a parent context can access a specific student.
 * Boundary: Capability permission (student:read) AND trusted parent-child link.
 */
export function canParentAccessStudent(
  context: TenantContext,
  student: StudentScopeRecord,
  linkedStudentIds: readonly string[],
): boolean {
  if (!isRecordTenantAligned(context, student.instituteId)) {
    return false;
  }

  if (context.role !== 'parent') {
    return false;
  }

  if (!AuthorizationEngine.hasCapability(context, CAPABILITIES.STUDENT_READ)) {
    return false;
  }

  if (!student.id || student.id.trim() === '') {
    return false;
  }

  if (!Array.isArray(linkedStudentIds) || linkedStudentIds.length === 0) {
    return false;
  }

  return linkedStudentIds.includes(student.id);
}

/**
 * Parent Collection Filter: Returns a filtered list of students accessible to a parent.
 * Preserves original record instances and deterministic ordering.
 */
export function filterStudentsForParent(
  context: TenantContext,
  students: readonly StudentScopeRecord[],
  linkedStudentIds: readonly string[],
): readonly StudentScopeRecord[] {
  if (!Array.isArray(students) || students.length === 0) {
    return [];
  }

  return students.filter((student) =>
    canParentAccessStudent(context, student, linkedStudentIds),
  );
}

/**
 * Teacher Resource Scope: Evaluates if a teacher can access a specific batch.
 * Boundary: Capability permission (academic:read) AND trusted teacher batch assignment.
 */
export function canTeacherAccessBatch(
  context: TenantContext,
  batch: BatchScopeRecord,
  scope: TeacherResourceScope,
): boolean {
  if (!isRecordTenantAligned(context, batch.instituteId)) {
    return false;
  }

  if (context.role !== 'teacher') {
    return false;
  }

  if (!AuthorizationEngine.hasCapability(context, CAPABILITIES.ACADEMIC_READ)) {
    return false;
  }

  if (!batch.id || batch.id.trim() === '') {
    return false;
  }

  if (!scope || !Array.isArray(scope.batchIds) || scope.batchIds.length === 0) {
    return false;
  }

  return scope.batchIds.includes(batch.id);
}

/**
 * Teacher Resource Scope: Evaluates if a teacher can access a student based on enrollment batch intersection.
 * Boundary: Capability permission (student:read) AND student batch enrollment intersects teacher scope.
 */
export function canTeacherAccessStudent(
  context: TenantContext,
  student: StudentBatchScopeRecord,
  scope: TeacherResourceScope,
): boolean {
  if (!isRecordTenantAligned(context, student.instituteId)) {
    return false;
  }

  if (context.role !== 'teacher') {
    return false;
  }

  if (!AuthorizationEngine.hasCapability(context, CAPABILITIES.STUDENT_READ)) {
    return false;
  }

  if (!student.id || student.id.trim() === '') {
    return false;
  }

  if (!scope || !Array.isArray(scope.batchIds) || scope.batchIds.length === 0) {
    return false;
  }

  if (!Array.isArray(student.batchIds) || student.batchIds.length === 0) {
    return false;
  }

  return student.batchIds.some((batchId) => scope.batchIds.includes(batchId));
}

/**
 * Unified Resource Scope & Capability Authorization Policy Check
 * Combines Capability Authorization (Layer 1) and Resource Scope (Layer 2).
 */
export function canAccessStudent(
  context: TenantContext,
  student: StudentBatchScopeRecord,
  capability: Capability = CAPABILITIES.STUDENT_READ,
  parentScope?: ParentResourceScope,
  teacherScope?: TeacherResourceScope,
): boolean {
  // Layer 1: Capability Authorization
  if (!AuthorizationEngine.hasCapability(context, capability)) {
    return false;
  }

  // Layer 2: Tenant Isolation
  if (!isRecordTenantAligned(context, student.instituteId)) {
    return false;
  }

  // Layer 3: Role-Specific Resource Scope
  if (context.role === 'owner' || context.role === 'assistant') {
    return true;
  }

  if (context.role === 'parent') {
    if (!parentScope) return false;
    return canParentAccessStudent(context, student, parentScope.linkedStudentIds);
  }

  if (context.role === 'teacher') {
    if (!teacherScope) return false;
    return canTeacherAccessStudent(context, student, teacherScope);
  }

  return false;
}

/**
 * Assertion Guard: Asserts that a TenantContext can access a specific student resource.
 * Throws AuthorizationError if denied.
 */
export function requireStudentAccess(
  context: TenantContext,
  student: StudentBatchScopeRecord,
  capability: Capability = CAPABILITIES.STUDENT_READ,
  parentScope?: ParentResourceScope,
  teacherScope?: TeacherResourceScope,
): void {
  if (!canAccessStudent(context, student, capability, parentScope, teacherScope)) {
    throw new AuthorizationError(
      `Permission denied: Resource access denied for student '${student?.id}'`,
    );
  }
}
