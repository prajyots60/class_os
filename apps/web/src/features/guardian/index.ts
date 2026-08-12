/**
 * @coaching-os/web — Guardian Feature Package Entry Point
 * Exposes feature components, API clients, and types for Staff Guardian management.
 */

export * from './types/guardian-ui.types';
export * from './api/guardian-api';

export { GuardianPrimaryBadge, GuardianRelationshipStatusBadge } from './components/guardian-status-badge';
export { StudentGuardiansSkeleton } from './components/student-guardians-skeleton';
export { StudentGuardiansEmptyState } from './components/student-guardians-empty-state';
export { PrimaryReplacementModal } from './components/primary-replacement-modal';
export { ArchiveGuardianModal } from './components/archive-guardian-modal';
export { EditGuardianModal } from './components/edit-guardian-modal';
export { AddGuardianModal } from './components/add-guardian-modal';
export { StudentGuardiansList } from './components/student-guardians-list';
