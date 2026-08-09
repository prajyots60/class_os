import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  db,
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  createTestInstitute,
  createTestUser,
  createTestStudent,
  createTestBatch,
} from './index';

describe('Multi-Tenant Data Isolation Suite', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('strictly isolates student records between Institute A and Institute B', async () => {
    const instA = await createTestInstitute({ name: 'Sharma Classes' });
    const instB = await createTestInstitute({ name: 'Verma Tutorials' });

    const userA = await createTestUser({ email: 'sharma_owner@test.com', instituteId: instA.id });
    const userB = await createTestUser({ email: 'verma_owner@test.com', instituteId: instB.id });

    expect(userA.instituteId).toBe(instA.id);
    expect(userB.instituteId).toBe(instB.id);

    const studentA = await createTestStudent(instA.id, {
      firstName: 'Rahul',
      lastName: 'Sharma',
      admissionNumber: 'ADM-A1',
    });
    const studentB = await createTestStudent(instB.id, {
      firstName: 'Priya',
      lastName: 'Verma',
      admissionNumber: 'ADM-B1',
    });

    // Query scoped to Institute A
    const instAStudent = await db.student.findFirst({
      where: { id: studentA.id, instituteId: instA.id },
    });
    expect(instAStudent?.firstName).toBe('Rahul');

    // Attempting to query Institute B's student using Institute A's instituteId context MUST yield null
    const leakedStudent = await db.student.findFirst({
      where: { id: studentB.id, instituteId: instA.id },
    });
    expect(leakedStudent).toBeNull();
  });

  it('prevents cross-tenant batch querying', async () => {
    const instA = await createTestInstitute({ name: 'Institute A' });
    const instB = await createTestInstitute({ name: 'Institute B' });

    const batchA = await createTestBatch(instA.id, undefined, { name: 'Batch 2026 A' });
    const batchB = await createTestBatch(instB.id, undefined, { name: 'Batch 2026 B' });

    const countInstA = await db.batch.count({ where: { instituteId: instA.id } });
    const countInstB = await db.batch.count({ where: { instituteId: instB.id } });

    expect(countInstA).toBe(1);
    expect(countInstB).toBe(1);

    const crossQuery = await db.batch.findFirst({
      where: { id: batchB.id, instituteId: instA.id },
    });
    expect(crossQuery).toBeNull();
  });
});
