import {
  cleanTestDatabase,
  closeTestPool,
  db,
  validateTestEnvironment,
} from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EnrollmentEntity } from '../../domain/entities/enrollment.entity';
import { PrismaEnrollmentRepository } from './prisma-enrollment.repository';

describe('PrismaEnrollmentRepository Integration Suite', () => {
  let repository: PrismaEnrollmentRepository;

  let instituteA_Id: string;
  let instituteB_Id: string;

  let subjectA_Id: string;
  let subjectB_Id: string;

  let batchA1_Id: string;
  let batchA2_Id: string;
  let batchB1_Id: string;

  let studentA1_Id: string;
  let studentA2_Id: string;
  let studentB1_Id: string;

  beforeAll(() => {
    validateTestEnvironment();
    repository = new PrismaEnrollmentRepository();
  });

  beforeEach(async () => {
    await cleanTestDatabase();

    // 1. Create Tenant Institutes
    const instA = await db.institute.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Apex Academy Institute A',
        slug: `apex-inst-a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543210',
        email: `inst-a-${Date.now()}-${Math.floor(Math.random() * 1000)}@apex.com`,
      },
    });
    instituteA_Id = instA.id;

    const instB = await db.institute.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Zenith Classes Institute B',
        slug: `zenith-inst-b-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543211',
        email: `inst-b-${Date.now()}-${Math.floor(Math.random() * 1000)}@zenith.com`,
      },
    });
    instituteB_Id = instB.id;

    // 2. Create Subjects
    const subjA = await db.subject.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        name: 'Physics Inst A',
        code: 'PHY-A',
      },
    });
    subjectA_Id = subjA.id;

    const subjB = await db.subject.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        name: 'Physics Inst B',
        code: 'PHY-B',
      },
    });
    subjectB_Id = subjB.id;

    // 3. Create Batches
    const batchA1 = await db.batch.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        subjectId: subjectA_Id,
        name: 'Physics Morning Batch A1',
        code: 'BATCH-A1',
        status: 'open',
      },
    });
    batchA1_Id = batchA1.id;

    const batchA2 = await db.batch.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        subjectId: subjectA_Id,
        name: 'Physics Evening Batch A2',
        code: 'BATCH-A2',
        status: 'open',
      },
    });
    batchA2_Id = batchA2.id;

    const batchB1 = await db.batch.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        subjectId: subjectB_Id,
        name: 'Physics Batch B1',
        code: 'BATCH-B1',
        status: 'open',
      },
    });
    batchB1_Id = batchB1.id;

    // 4. Create Students
    const studentA1 = await db.student.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        admissionNumber: 'ADM-A1',
        firstName: 'Aarav',
        lastName: 'Sharma',
      },
    });
    studentA1_Id = studentA1.id;

    const studentA2 = await db.student.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        admissionNumber: 'ADM-A2',
        firstName: 'Ananya',
        lastName: 'Verma',
      },
    });
    studentA2_Id = studentA2.id;

    const studentB1 = await db.student.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        admissionNumber: 'ADM-B1',
        firstName: 'Rohan',
        lastName: 'Gupta',
      },
    });
    studentB1_Id = studentB1.id;
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('ENROLLMENT-DB-01: creates and persists a valid enrollment record in PostgreSQL', async () => {
    const enrollment = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
      status: 'pending',
    });

    const saved = await repository.create(enrollment);

    expect(saved.id).toBe(enrollment.id);
    expect(saved.instituteId).toBe(instituteA_Id);
    expect(saved.studentId).toBe(studentA1_Id);
    expect(saved.batchId).toBe(batchA1_Id);
    expect(saved.status).toBe('pending');
    expect(saved.enrolledAt).toBeInstanceOf(Date);

    const dbRecord = await db.enrollment.findUnique({
      where: { id: enrollment.id },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.instituteId).toBe(instituteA_Id);
    expect(dbRecord?.studentId).toBe(studentA1_Id);
    expect(dbRecord?.batchId).toBe(batchA1_Id);
    expect(dbRecord?.status).toBe('pending');
  });

  it('ENROLLMENT-DB-02: reads enrollment by tenant + ID', async () => {
    const enrollment = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
    });
    await repository.create(enrollment);

    const found = await repository.findById(instituteA_Id, enrollment.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(enrollment.id);
    expect(found?.instituteId).toBe(instituteA_Id);
  });

  it('ENROLLMENT-DB-03: reads enrollments by student within tenant scope', async () => {
    const enr1 = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
    });
    const enr2 = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA2_Id,
    });
    await repository.create(enr1);
    await repository.create(enr2);

    const studentEnrollments = await repository.findByStudent(instituteA_Id, studentA1_Id);
    expect(studentEnrollments).toHaveLength(2);
    const ids = studentEnrollments.map((e) => e.id);
    expect(ids).toContain(enr1.id);
    expect(ids).toContain(enr2.id);
  });

  it('ENROLLMENT-DB-04: reads enrollments by batch within tenant scope', async () => {
    const enr1 = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
    });
    const enr2 = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA2_Id,
      batchId: batchA1_Id,
    });
    await repository.create(enr1);
    await repository.create(enr2);

    const batchEnrollments = await repository.findByBatch(instituteA_Id, batchA1_Id);
    expect(batchEnrollments).toHaveLength(2);
    const ids = batchEnrollments.map((e) => e.id);
    expect(ids).toContain(enr1.id);
    expect(ids).toContain(enr2.id);
  });

  it('ENROLLMENT-DB-05: finds student + batch relationship', async () => {
    const enrollment = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
    });
    await repository.create(enrollment);

    const found = await repository.findByStudentAndBatch(instituteA_Id, studentA1_Id, batchA1_Id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(enrollment.id);

    const notFound = await repository.findByStudentAndBatch(instituteA_Id, studentA1_Id, batchA2_Id);
    expect(notFound).toBeNull();
  });

  it('ENROLLMENT-DB-06: duplicate enrollment for same student and batch is rejected by UNIQUE constraint', async () => {
    const enr1 = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
    });
    await repository.create(enr1);

    const enrDup = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
    });

    await expect(repository.create(enrDup)).rejects.toThrow(ConflictError);
  });

  it('ENROLLMENT-DB-07: multiple different batches for same student allowed', async () => {
    const enr1 = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
    });
    const enr2 = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA2_Id,
    });

    const saved1 = await repository.create(enr1);
    const saved2 = await repository.create(enr2);

    expect(saved1.id).not.toBe(saved2.id);
    expect(saved1.batchId).toBe(batchA1_Id);
    expect(saved2.batchId).toBe(batchA2_Id);
  });

  it('ENROLLMENT-DB-08: different students in same batch allowed', async () => {
    const enr1 = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
    });
    const enr2 = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA2_Id,
      batchId: batchA1_Id,
    });

    const saved1 = await repository.create(enr1);
    const saved2 = await repository.create(enr2);

    expect(saved1.id).not.toBe(saved2.id);
    expect(saved1.studentId).toBe(studentA1_Id);
    expect(saved2.studentId).toBe(studentA2_Id);

    const count = await repository.countActiveOrPendingByBatch(instituteA_Id, batchA1_Id);
    expect(count).toBe(2);
  });

  it('ENROLLMENT-DB-09: cross-tenant enrollment lookup blocked', async () => {
    const enrA = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
    });
    await repository.create(enrA);

    // Querying Inst A's enrollment using Inst B's tenant context returns null/empty
    expect(await repository.findById(instituteB_Id, enrA.id)).toBeNull();
    expect(await repository.findByStudent(instituteB_Id, studentA1_Id)).toHaveLength(0);
    expect(await repository.findByBatch(instituteB_Id, batchA1_Id)).toHaveLength(0);
    expect(await repository.findByStudentAndBatch(instituteB_Id, studentA1_Id, batchA1_Id)).toBeNull();
  });

  it('ENROLLMENT-DB-10: cross-tenant student relationship blocked on creation', async () => {
    // Attempting to enroll Inst B's student in Inst A's batch under Inst A's tenant context
    const invalidCrossTenant = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentB1_Id, // Belongs to Institute B!
      batchId: batchA1_Id,
    });

    await expect(repository.create(invalidCrossTenant)).rejects.toThrow(ValidationError);
  });

  it('ENROLLMENT-DB-11: cross-tenant batch relationship blocked on creation', async () => {
    // Attempting to enroll Inst A's student in Inst B's batch under Inst A's tenant context
    const invalidCrossTenant = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchB1_Id, // Belongs to Institute B!
    });

    await expect(repository.create(invalidCrossTenant)).rejects.toThrow(ValidationError);
  });

  it('ENROLLMENT-DB-12: persists full state machine lifecycle transitions in PostgreSQL', async () => {
    const enrollment = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
      status: 'pending',
    });
    await repository.create(enrollment);

    // 1. Activate
    enrollment.activate();
    const activeSaved = await repository.update(enrollment);
    expect(activeSaved.status).toBe('active');

    // 2. Complete
    enrollment.complete();
    const completedSaved = await repository.update(enrollment);
    expect(completedSaved.status).toBe('completed');
    expect(completedSaved.completedAt).toBeInstanceOf(Date);
  });

  it('ENROLLMENT-DB-13: transferred enrollment can be persisted (Option B Atomic Historical Preservation)', async () => {
    const sourceEnrollment = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
      status: 'active',
    });
    await repository.create(sourceEnrollment);

    // Create target enrollment in destination batch
    const targetEnrollment = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA2_Id,
      status: 'active',
    });
    const savedTarget = await repository.create(targetEnrollment);

    // Mark source as transferred pointing to destination
    sourceEnrollment.markTransferred(batchA2_Id, savedTarget.id);
    const savedSource = await repository.update(sourceEnrollment);

    expect(savedSource.status).toBe('transferred');
    expect(savedSource.batchId).toBe(batchA1_Id); // Source batch unchanged!
    expect(savedSource.transferredToBatchId).toBe(batchA2_Id);
    expect(savedSource.transferredToEnrollmentId).toBe(savedTarget.id);
    expect(savedSource.transferredAt).toBeInstanceOf(Date);

    // Verify DB record contains transferred references
    const dbSource = await db.enrollment.findUnique({
      where: { id: sourceEnrollment.id },
    });
    expect(dbSource?.status).toBe('transferred');
    expect(dbSource?.transferredToBatchId).toBe(batchA2_Id);
    expect(dbSource?.transferredToEnrollmentId).toBe(savedTarget.id);
  });

  it('ENROLLMENT-DB-14: enrollment history remains intact after state transitions', async () => {
    const enr1 = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
      status: 'active',
    });
    await repository.create(enr1);

    enr1.complete();
    await repository.update(enr1);

    const history = await repository.findByStudent(instituteA_Id, studentA1_Id);
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('completed');
  });

  it('ENROLLMENT-DB-15: student deletion is restricted while enrollment exists in PostgreSQL (onDelete: Restrict)', async () => {
    const enrollment = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
    });
    await repository.create(enrollment);

    // Deleting student in database should throw foreign key constraint violation
    await expect(
      db.student.delete({
        where: { id: studentA1_Id },
      }),
    ).rejects.toThrow();
  });

  it('ENROLLMENT-DB-16: batch deletion is restricted while enrollment exists in PostgreSQL (onDelete: Restrict)', async () => {
    const enrollment = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
    });
    await repository.create(enrollment);

    // Deleting batch in database should throw foreign key constraint violation
    await expect(
      db.batch.delete({
        where: { id: batchA1_Id },
      }),
    ).rejects.toThrow();
  });

  it('ENROLLMENT-DB-17: institute deletion follows existing tenant policy (onDelete: Cascade)', async () => {
    const enrollment = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
    });
    await repository.create(enrollment);

    // Deleting institute cascades and removes enrollments
    await db.institute.delete({
      where: { id: instituteA_Id },
    });

    const dbRecord = await db.enrollment.findUnique({
      where: { id: enrollment.id },
    });
    expect(dbRecord).toBeNull();
  });

  it('ENROLLMENT-DB-18: soft archival does not destroy enrollment history', async () => {
    const enrollment = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
      status: 'active',
    });
    await repository.create(enrollment);

    enrollment.archive();
    await repository.update(enrollment);

    const dbRecord = await db.enrollment.findUnique({
      where: { id: enrollment.id },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.deletedAt).not.toBeNull();
  });

  it('ENROLLMENT-DB-19: concurrency handling for duplicate insertion', async () => {
    const enr1 = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
    });
    const enr2 = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
    });

    const results = await Promise.allSettled([
      repository.create(enr1),
      repository.create(enr2),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);
  });

  it('ENROLLMENT-DB-20: transfer transaction guarantees strict all-or-nothing rollback on validation failure', async () => {
    // Setup active enrollment in batchA1
    const sourceEnrollment = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA1_Id,
      status: 'active',
    });
    await repository.create(sourceEnrollment);

    // Set batchA2 capacity to 0 so transfer will fail
    await db.batch.update({
      where: { id: batchA2_Id },
      data: { capacity: 0 },
    });

    const destinationEnrollment = EnrollmentEntity.create({
      instituteId: instituteA_Id,
      studentId: studentA1_Id,
      batchId: batchA2_Id,
      status: 'active',
    });

    sourceEnrollment.markTransferred(batchA2_Id, destinationEnrollment.id);

    // Execution must reject due to capacity conflict
    await expect(
      repository.transferWithCapacityCheck({
        sourceEnrollment,
        targetBatchId: batchA2_Id,
        destinationEnrollment,
      }),
    ).rejects.toThrow(ConflictError);

    // Invariant Check 1: Source enrollment remains unchanged ('active') in database
    const dbSource = await db.enrollment.findUnique({
      where: { id: sourceEnrollment.id },
    });
    expect(dbSource?.status).toBe('active');
    expect(dbSource?.transferredToBatchId).toBeNull();
    expect(dbSource?.transferredToEnrollmentId).toBeNull();

    // Invariant Check 2: Destination enrollment was NEVER created in database
    const dbDestination = await db.enrollment.findUnique({
      where: { id: destinationEnrollment.id },
    });
    expect(dbDestination).toBeNull();
  });
});
