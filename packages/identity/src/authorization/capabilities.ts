/**
 * Authoritative Runtime Capability Registry for CoachingOS
 * Format: resource:action
 */
export const CAPABILITIES = {
  // Institute Management
  INSTITUTE_READ: 'institute:read',
  INSTITUTE_UPDATE: 'institute:update',
  INSTITUTE_ARCHIVE: 'institute:archive',
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
  BRANDING_READ: 'branding:read',
  BRANDING_UPDATE: 'branding:update',

  // Staff & Membership Management
  STAFF_READ: 'staff:read',
  STAFF_INVITE: 'staff:invite',
  STAFF_UPDATE: 'staff:update',
  STAFF_REMOVE: 'staff:remove',
  STAFF_ROLE_CHANGE: 'staff:role_change',

  // Student & Guardian Management
  STUDENT_READ: 'student:read',
  STUDENT_CREATE: 'student:create',
  STUDENT_UPDATE: 'student:update',
  STUDENT_ARCHIVE: 'student:archive',

  // Academic Hierarchy & Attendance
  ACADEMIC_READ: 'academic:read',
  ACADEMIC_WRITE: 'academic:write',
  ATTENDANCE_READ: 'attendance:read',
  ATTENDANCE_MARK: 'attendance:mark',
  ATTENDANCE_UPDATE: 'attendance:update',
  ATTENDANCE_CORRECT: 'attendance:correct',

  // Homework & Examinations
  HOMEWORK_READ: 'homework:read',
  HOMEWORK_CREATE: 'homework:create',
  HOMEWORK_UPDATE: 'homework:update',
  HOMEWORK_DELETE: 'homework:delete',
  TEST_READ: 'test:read',
  TEST_CREATE: 'test:create',
  TEST_UPDATE: 'test:update',
  TEST_DELETE: 'test:delete',
  MARKS_READ: 'marks:read',
  MARKS_CREATE: 'marks:create',
  MARKS_UPDATE: 'marks:update',
  MARKS_DELETE: 'marks:delete',
  MARKS_PUBLISH: 'marks:publish',

  // Billing, Invoices & Financials
  BILLING_READ: 'billing:read',
  BILLING_CREATE: 'billing:create',
  BILLING_UPDATE: 'billing:update',
  BILLING_CANCEL: 'billing:cancel',
  PAYMENT_READ: 'payment:read',
  PAYMENT_RECORD: 'payment:record',
  RECEIPT_READ: 'receipt:read',
  RECEIPT_ISSUE: 'receipt:issue',

  // Communication & Audit
  ANNOUNCEMENT_READ: 'announcement:read',
  ANNOUNCEMENT_CREATE: 'announcement:create',
  ANNOUNCEMENT_UPDATE: 'announcement:update',
  ANNOUNCEMENT_DELETE: 'announcement:delete',
  ANNOUNCEMENT_PUBLISH: 'announcement:publish',
  AUDIT_READ: 'audit:read',

  // Parent CRM Management (Phase 1.7)
  PARENT_READ: 'parent:read',
  PARENT_CREATE: 'parent:create',
  PARENT_UPDATE: 'parent:update',
  PARENT_ARCHIVE: 'parent:archive',

  // Guardian & Relationship Management (Phase 1.9)
  GUARDIAN_READ: 'guardian:read',
  GUARDIAN_CREATE: 'guardian:create',
  GUARDIAN_UPDATE: 'guardian:update',
  GUARDIAN_ARCHIVE: 'guardian:archive',
  GUARDIAN_PRIMARY: 'guardian:primary',

  RELATIONSHIP_READ: 'relationship:read',
  RELATIONSHIP_CREATE: 'relationship:create',
  RELATIONSHIP_UPDATE: 'relationship:update',
  RELATIONSHIP_ARCHIVE: 'relationship:archive',
  RELATIONSHIP_PRIMARY: 'relationship:primary',
} as const;

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

export type CapabilityResource =
  | 'institute'
  | 'settings'
  | 'branding'
  | 'staff'
  | 'student'
  | 'parent'
  | 'guardian'
  | 'relationship'
  | 'academic'
  | 'attendance'
  | 'homework'
  | 'test'
  | 'marks'
  | 'billing'
  | 'payment'
  | 'receipt'
  | 'announcement'
  | 'audit';

export type CapabilityAction =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'write'
  | 'archive'
  | 'invite'
  | 'remove'
  | 'role_change'
  | 'mark'
  | 'correct'
  | 'publish'
  | 'cancel'
  | 'record'
  | 'issue'
  | 'primary';

const ALL_CAPABILITIES_SET: ReadonlySet<string> = new Set(Object.values(CAPABILITIES));

const ALL_RESOURCES_SET: ReadonlySet<string> = new Set([
  'institute',
  'settings',
  'branding',
  'staff',
  'student',
  'parent',
  'guardian',
  'relationship',
  'academic',
  'attendance',
  'homework',
  'test',
  'marks',
  'billing',
  'payment',
  'receipt',
  'announcement',
  'audit',
]);

const ALL_ACTIONS_SET: ReadonlySet<string> = new Set([
  'read',
  'create',
  'update',
  'delete',
  'write',
  'archive',
  'invite',
  'remove',
  'role_change',
  'mark',
  'correct',
  'publish',
  'cancel',
  'record',
  'issue',
  'primary',
]);

/**
 * Runtime Type Guards
 */
export function isCapability(value: unknown): value is Capability {
  return typeof value === 'string' && ALL_CAPABILITIES_SET.has(value);
}

export function isCapabilityResource(value: unknown): value is CapabilityResource {
  return typeof value === 'string' && ALL_RESOURCES_SET.has(value);
}

export function isCapabilityAction(value: unknown): value is CapabilityAction {
  return typeof value === 'string' && ALL_ACTIONS_SET.has(value);
}
