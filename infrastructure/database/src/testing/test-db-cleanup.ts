import { db } from '../index';
import { validateTestEnvironment } from './test-db-guard';

/**
 * Truncates all domain & auth data tables in dependency-safe order using Prisma Client.
 * Ensures strict test isolation without resetting database schema.
 */
export async function cleanTestDatabase(): Promise<void> {
  validateTestEnvironment();

  const tablesToTruncate = [
    'receipts',
    'payments',
    'invoices',
    'billing_plans',
    'marks',
    'tests',
    'homework',
    'attendance',
    'batch_sessions',
    'schedules',
    'enrollments',
    'batches',
    'subjects',
    'programs',
    'student_links',
    'child_profiles',
    'parent_identities',
    'institute_parent_students',
    'institute_parents',
    'students',
    'audit_logs',
    'branding',
    'settings',
    'announcements',
    'institute_memberships',
    'institutes',
    'sessions',
    'accounts',
    'verifications',
    'users',
  ];

  const truncateQuery = `TRUNCATE TABLE ${tablesToTruncate.map((t) => `"${t}"`).join(', ')} CASCADE;`;
  await db.$executeRawUnsafe(truncateQuery);
}

export async function closeTestPool(): Promise<void> {
  await db.$disconnect();
}
