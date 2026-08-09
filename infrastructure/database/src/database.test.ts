import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  db,
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  createTestInstitute,
  createTestUser,
  createTestStudent,
  createTestSubject,
  createTestBatch,
  createTestEnrollment,
} from './index';

describe('Database Integration & Test Safety Suite', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('fails safety guard if TEST_DATABASE_URL is missing or matches main DATABASE_URL', () => {
    expect(() => {
      validateTestEnvironment();
    }).not.toThrow();

    // Verify safety check throws if DATABASE_URL is forced to match TEST_DATABASE_URL
    const originalMainUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    expect(() => {
      validateTestEnvironment();
    }).toThrow(/SAFETY GUARD TRIGGERED/);

    process.env.DATABASE_URL = originalMainUrl;
  });

  it('creates and retrieves institutes and users in PostgreSQL test database', async () => {
    const inst = await createTestInstitute({ name: 'Alpha Coaching' });
    const user = await createTestUser({ email: 'owner@alpha.com' });

    expect(inst.id).toBeDefined();
    expect(inst.name).toBe('Alpha Coaching');
    expect(user.id).toBeDefined();

    const retrievedInst = await db.institute.findUnique({ where: { id: inst.id } });
    expect(retrievedInst?.name).toBe('Alpha Coaching');
  });

  it('handles cascade deletes cleanly when cleaning test database', async () => {
    await cleanTestDatabase();
    const inst = await createTestInstitute();
    const student = await createTestStudent(inst.id);
    const subject = await createTestSubject(inst.id);
    const batch = await createTestBatch(inst.id, subject.id);
    await createTestEnrollment(student.id, batch.id);

    const countBefore = await db.enrollment.count();
    expect(countBefore).toBe(1);

    await cleanTestDatabase();

    const countAfter = await db.enrollment.count();
    expect(countAfter).toBe(0);
  });
});
