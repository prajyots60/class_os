import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanTestDatabase,
  createTestBatch,
  createTestEnrollment,
  createTestInstitute,
  createTestStudent,
  createTestUser,
  validateTestEnvironment,
} from '@coaching-os/database';
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '@coaching-os/shared';
import {
  CreateInstituteMembershipUseCase,
  CreateSubjectUseCase,
  PrismaBatchRepository,
  PrismaEnrollmentRepository,
  PrismaInstituteMembershipRepository,
  PrismaStudentRepository,
  PrismaSubjectRepository,
  type TenantContext,
} from '@coaching-os/identity';
import { PrismaTestRepository } from '../../infrastructure/repositories/prisma-test.repository';
import { PrismaMarksRepository } from '../../infrastructure/repositories/prisma-marks.repository';
import {
  CreateTestUseCase,
  DeleteTestUseCase,
  EnterTestMarksUseCase,
  GetTestMarksUseCase,
  GetTestUseCase,
  ListTestsForBatchUseCase,
  PublishTestResultsUseCase,
  ScheduleTestUseCase,
  UpdateTestUseCase,
} from './assessment.use-cases';

describe('Phase 2.4 — Assessment & Bulk Marks Engine Integration & Security Suite', () => {
  let membershipRepo: PrismaInstituteMembershipRepository;
  let subjectRepo: PrismaSubjectRepository;
  let batchRepo: PrismaBatchRepository;
  let enrollmentRepo: PrismaEnrollmentRepository;
  let testRepo: PrismaTestRepository;
  let marksRepo: PrismaMarksRepository;

  let createMembershipUseCase: CreateInstituteMembershipUseCase;
  let createSubjectUseCase: CreateSubjectUseCase;

  let createTestUseCase: CreateTestUseCase;
  let getTestUseCase: GetTestUseCase;
  let listTestsUseCase: ListTestsForBatchUseCase;
  let updateTestUseCase: UpdateTestUseCase;
  let scheduleTestUseCase: ScheduleTestUseCase;
  let enterMarksUseCase: EnterTestMarksUseCase;
  let getMarksUseCase: GetTestMarksUseCase;
  let publishResultsUseCase: PublishTestResultsUseCase;
  let deleteTestUseCase: DeleteTestUseCase;

  // Institute A
  let ownerContextA: TenantContext;
  let batchAId: string;
  let batchA2Id: string;
  let enrollmentA1Id: string;
  let enrollmentA2Id: string;
  let enrollmentAOtherBatchId: string;

  // Institute B (Adversarial Tenant)
  let ownerContextB: TenantContext;
  let batchBId: string;
  let enrollmentBId: string;

  beforeEach(async () => {
    validateTestEnvironment();
    await cleanTestDatabase();

    membershipRepo = new PrismaInstituteMembershipRepository();
    subjectRepo = new PrismaSubjectRepository();
    batchRepo = new PrismaBatchRepository();
    enrollmentRepo = new PrismaEnrollmentRepository();
    testRepo = new PrismaTestRepository();
    marksRepo = new PrismaMarksRepository();

    createMembershipUseCase = new CreateInstituteMembershipUseCase(membershipRepo);
    createSubjectUseCase = new CreateSubjectUseCase(subjectRepo);

    createTestUseCase = new CreateTestUseCase(testRepo, batchRepo);
    getTestUseCase = new GetTestUseCase(testRepo);
    listTestsUseCase = new ListTestsForBatchUseCase(testRepo, batchRepo);
    updateTestUseCase = new UpdateTestUseCase(testRepo);
    scheduleTestUseCase = new ScheduleTestUseCase(testRepo);
    enterMarksUseCase = new EnterTestMarksUseCase(testRepo, marksRepo, enrollmentRepo);
    getMarksUseCase = new GetTestMarksUseCase(testRepo, marksRepo);
    publishResultsUseCase = new PublishTestResultsUseCase(testRepo);
    deleteTestUseCase = new DeleteTestUseCase(testRepo);

    // Setup Institute A
    const instA = await createTestInstitute({
      name: 'Apex Academy A',
      slug: `apex-a-${crypto.randomUUID().substring(0, 6)}`,
    });

    const userOwnerA = await createTestUser();
    const ownerMemA = await createMembershipUseCase.execute({
      userId: userOwnerA.id,
      instituteId: instA.id,
      role: 'owner',
    });

    ownerContextA = {
      userId: userOwnerA.id,
      instituteId: instA.id,
      membershipId: ownerMemA.id,
      role: 'owner',
      status: 'active',
    };

    const subjectA = await createSubjectUseCase.execute(ownerContextA, {
      name: 'Physics',
      code: 'PHY-101',
    });

    const batchA1 = await createTestBatch(instA.id, subjectA.id, {
      name: 'Batch Alpha 2026',
      code: 'PHY-ALPHA-26',
    });
    batchAId = batchA1.id;

    const batchA2 = await createTestBatch(instA.id, subjectA.id, {
      name: 'Batch Beta 2026',
      code: 'PHY-BETA-26',
    });
    batchA2Id = batchA2.id;

    // Enrollments in Batch A1 (active)
    const s1 = await createTestStudent(instA.id, { firstName: 'Alice', lastName: 'Smith' });
    const s2 = await createTestStudent(instA.id, { firstName: 'Bob', lastName: 'Jones' });
    const enr1 = await createTestEnrollment(s1.id, batchAId, { status: 'active' });
    const enr2 = await createTestEnrollment(s2.id, batchAId, { status: 'active' });
    enrollmentA1Id = enr1.id;
    enrollmentA2Id = enr2.id;

    // Enrollment in Batch A2 (active)
    const sOther = await createTestStudent(instA.id, { firstName: 'Charlie', lastName: 'Brown' });
    const enrOther = await createTestEnrollment(sOther.id, batchA2Id, { status: 'active' });
    enrollmentAOtherBatchId = enrOther.id;

    // Setup Institute B (Adversarial Tenant)
    const instB = await createTestInstitute({
      name: 'Beta Institute B',
      slug: `beta-b-${crypto.randomUUID().substring(0, 6)}`,
    });

    const userOwnerB = await createTestUser();
    const ownerMemB = await createMembershipUseCase.execute({
      userId: userOwnerB.id,
      instituteId: instB.id,
      role: 'owner',
    });

    ownerContextB = {
      userId: userOwnerB.id,
      instituteId: instB.id,
      membershipId: ownerMemB.id,
      role: 'owner',
      status: 'active',
    };

    const subjectB = await createSubjectUseCase.execute(ownerContextB, {
      name: 'Chemistry',
      code: 'CHE-101',
    });

    const batchB = await createTestBatch(instB.id, subjectB.id, {
      name: 'Batch Gamma 2026',
      code: 'CHE-GAMMA-26',
    });
    batchBId = batchB.id;

    const sB = await createTestStudent(instB.id, { firstName: 'David', lastName: 'Miller' });
    const enrB = await createTestEnrollment(sB.id, batchBId, { status: 'active' });
    enrollmentBId = enrB.id;
  });

  afterEach(async () => {
    await cleanTestDatabase();
  });

  describe('1. Assessment Lifecycle & Bulk Marks Core Workflow', () => {
    it('should complete full lifecycle: create (draft) -> schedule -> enter marks -> publish', async () => {
      // 1. Create Test (draft)
      const test = await createTestUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Physics Midterm Assessment',
        maximumMarks: 100,
      });

      expect(test.id).toBeDefined();
      expect(test.status).toBe('draft');
      expect(test.maximumMarks).toBe(100);

      // 2. Schedule Test
      const scheduled = await scheduleTestUseCase.execute(ownerContextA, test.id, '2026-08-20');
      expect(scheduled.status).toBe('scheduled');

      // 3. Enter Bulk Marks
      const marks = await enterMarksUseCase.execute(ownerContextA, {
        testId: test.id,
        records: [
          { enrollmentId: enrollmentA1Id, marksObtained: 88.5 },
          { enrollmentId: enrollmentA2Id, marksObtained: 94.0 },
        ],
      });

      expect(marks.length).toBe(2);
      expect(marks.find((m) => m.enrollmentId === enrollmentA1Id)?.marksObtained).toBe(88.5);

      // Verify Test status updated to marks_entered automatically
      const updatedTest = await getTestUseCase.execute(ownerContextA, test.id);
      expect(updatedTest.status).toBe('marks_entered');

      // 4. Publish Results
      const published = await publishResultsUseCase.execute(ownerContextA, test.id);
      expect(published.status).toBe('published');
      expect(published.isPublished).toBe(true);

      // 5. Verify published marks can be read
      const fetchedMarks = await getMarksUseCase.execute(ownerContextA, test.id);
      expect(fetchedMarks.length).toBe(2);
    });

    it('ASSESSMENT-SEC-14: should be IDEMPOTENT: repeated bulk marks submissions update in-place without creating duplicate DB rows', async () => {
      const test = await createTestUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Physics Quiz 1',
        maximumMarks: 50,
      });

      // First entry
      await enterMarksUseCase.execute(ownerContextA, {
        testId: test.id,
        records: [
          { enrollmentId: enrollmentA1Id, marksObtained: 40 },
          { enrollmentId: enrollmentA2Id, marksObtained: 45 },
        ],
      });

      // Second entry with updated score for student 1
      await enterMarksUseCase.execute(ownerContextA, {
        testId: test.id,
        records: [
          { enrollmentId: enrollmentA1Id, marksObtained: 42.5 },
          { enrollmentId: enrollmentA2Id, marksObtained: 45 },
        ],
      });

      // Verify DB row count is strictly 2
      const fetchedMarks = await getMarksUseCase.execute(ownerContextA, test.id);
      expect(fetchedMarks.length).toBe(2);
      expect(fetchedMarks.find((m) => m.enrollmentId === enrollmentA1Id)?.marksObtained).toBe(42.5);
    });
  });

  describe('2. Invariant Enforcement & Domain Boundary Rules', () => {
    it('ASSESSMENT-SEC-09: ACADEMIC-010: should reject marksObtained > maximumMarks', async () => {
      const test = await createTestUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Physics Test (Max 50)',
        maximumMarks: 50,
      });

      await expect(
        enterMarksUseCase.execute(ownerContextA, {
          testId: test.id,
          records: [{ enrollmentId: enrollmentA1Id, marksObtained: 50.5 }], // Exceeds max 50
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('ASSESSMENT-SEC-10: ACADEMIC-010: should reject negative marksObtained', async () => {
      const test = await createTestUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Physics Test',
        maximumMarks: 100,
      });

      await expect(
        enterMarksUseCase.execute(ownerContextA, {
          testId: test.id,
          records: [{ enrollmentId: enrollmentA1Id, marksObtained: -5 }],
        }),
      ).rejects.toThrow(zodErrorOrValidationError());
    });

    it('ASSESSMENT-SEC-11: should reject marksObtained exceeding 2 decimal places precision', async () => {
      const test = await createTestUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Physics Test',
        maximumMarks: 100,
      });

      await expect(
        enterMarksUseCase.execute(ownerContextA, {
          testId: test.id,
          records: [{ enrollmentId: enrollmentA1Id, marksObtained: 85.755 }],
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('ASSESSMENT-SEC-06: ACADEMIC-005: should reject enrollment belonging to a different batch in the same institute', async () => {
      const test = await createTestUseCase.execute(ownerContextA, {
        batchId: batchAId, // Belongs to Batch A1
        title: 'Batch A1 Test',
        maximumMarks: 100,
      });

      await expect(
        enterMarksUseCase.execute(ownerContextA, {
          testId: test.id,
          records: [
            { enrollmentId: enrollmentA1Id, marksObtained: 80 },
            { enrollmentId: enrollmentAOtherBatchId, marksObtained: 85 }, // Belongs to Batch A2
          ],
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('ASSESSMENT-SEC-12: should reject bulk marks payload containing duplicate enrollment IDs', async () => {
      const test = await createTestUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Physics Test',
        maximumMarks: 100,
      });

      await expect(
        enterMarksUseCase.execute(ownerContextA, {
          testId: test.id,
          records: [
            { enrollmentId: enrollmentA1Id, marksObtained: 80 },
            { enrollmentId: enrollmentA1Id, marksObtained: 90 }, // Duplicate enrollment ID
          ],
        }),
      ).rejects.toThrow(zodErrorOrValidationError());
    });

    it('ASSESSMENT-SEC-13: BULK ATOMICITY: should perform ZERO writes if any single mark in payload is invalid', async () => {
      const test = await createTestUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Physics Test',
        maximumMarks: 100,
      });

      await expect(
        enterMarksUseCase.execute(ownerContextA, {
          testId: test.id,
          records: [
            { enrollmentId: enrollmentA1Id, marksObtained: 80 },
            { enrollmentId: enrollmentAOtherBatchId, marksObtained: 85 }, // Invalid cross-batch enrollment
          ],
        }),
      ).rejects.toThrow(ValidationError);

      // Verify ZERO records written in DB
      const dbMarks = await getMarksUseCase.execute(ownerContextA, test.id);
      expect(dbMarks.length).toBe(0);

      // Verify test status remains draft
      const fetchedTest = await getTestUseCase.execute(ownerContextA, test.id);
      expect(fetchedTest.status).toBe('draft');
    });

    it('ASSESSMENT-SEC-15 & SEC-16: PUBLISHED IMMUTABILITY: should reject updating test details or entering marks once published', async () => {
      const test = await createTestUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Physics Final Exam',
        maximumMarks: 100,
      });

      await enterMarksUseCase.execute(ownerContextA, {
        testId: test.id,
        records: [{ enrollmentId: enrollmentA1Id, marksObtained: 95 }],
      });

      await publishResultsUseCase.execute(ownerContextA, test.id);

      // Reject updating test details
      await expect(
        updateTestUseCase.execute(ownerContextA, test.id, {
          title: 'Post-Publish Title Change Attempt',
        }),
      ).rejects.toThrow(ValidationError);

      // Reject entering/modifying marks after publication
      await expect(
        enterMarksUseCase.execute(ownerContextA, {
          testId: test.id,
          records: [{ enrollmentId: enrollmentA1Id, marksObtained: 98 }],
        }),
      ).rejects.toThrow(ValidationError);

      // Reject deleting published test
      await expect(deleteTestUseCase.execute(ownerContextA, test.id)).rejects.toThrow(
        ValidationError,
      );
    });

    it('ASSESSMENT-SEC-18: should reject publishing test results directly from draft state without entering marks', async () => {
      const test = await createTestUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Draft Test Without Marks',
        maximumMarks: 100,
      });

      await expect(publishResultsUseCase.execute(ownerContextA, test.id)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('3. Adversarial Multi-Tenant Security Suite', () => {
    it('ASSESSMENT-SEC-01: should reject unauthenticated request lacking ACADEMIC_WRITE capability', async () => {
      const parentContext: TenantContext = {
        userId: crypto.randomUUID(),
        instituteId: ownerContextA.instituteId,
        membershipId: crypto.randomUUID(),
        role: 'parent',
        status: 'active',
      };

      await expect(
        createTestUseCase.execute(parentContext, {
          batchId: batchAId,
          title: 'Unauthorized Test',
          maximumMarks: 100,
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('ASSESSMENT-SEC-04: should return NotFound when Institute B attempts to read Test A', async () => {
      const testA = await createTestUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Test A',
        maximumMarks: 100,
      });

      await expect(getTestUseCase.execute(ownerContextB, testA.id)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('ASSESSMENT-SEC-05: should return NotFound when Institute B attempts to enter marks for Test A', async () => {
      const testA = await createTestUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Test A',
        maximumMarks: 100,
      });

      await expect(
        enterMarksUseCase.execute(ownerContextB, {
          testId: testA.id,
          records: [{ enrollmentId: enrollmentBId, marksObtained: 50 }],
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('ASSESSMENT-SEC-05 (Cross-Tenant Enrollment): should return NotFound when Institute A attempts to submit enrollment from Institute B', async () => {
      const testA = await createTestUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Test A',
        maximumMarks: 100,
      });

      await expect(
        enterMarksUseCase.execute(ownerContextA, {
          testId: testA.id,
          records: [{ enrollmentId: enrollmentBId, marksObtained: 50 }], // Belongs to Institute B
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('ASSESSMENT-SEC-07 & SEC-08: should REJECT client attempt to inject instituteId or status in payload', async () => {
      await expect(
        createTestUseCase.execute(ownerContextA, {
          batchId: batchAId,
          title: 'Spoofed Test',
          maximumMarks: 100,
          instituteId: ownerContextB.instituteId,
        } as any),
      ).rejects.toThrow(zodErrorOrValidationError());

      await expect(
        createTestUseCase.execute(ownerContextA, {
          batchId: batchAId,
          title: 'Spoofed Test',
          maximumMarks: 100,
          status: 'published',
        } as any),
      ).rejects.toThrow(zodErrorOrValidationError());
    });
  });
});

function zodErrorOrValidationError() {
  return /unrecognized_keys|Unrecognized key|Validation error|invalid_type|Duplicate|too_small/i;
}
