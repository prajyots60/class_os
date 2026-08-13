import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanTestDatabase, createTestBatch, createTestEnrollment, createTestInstitute, createTestStudent, createTestUser, validateTestEnvironment } from '@coaching-os/database';
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '@coaching-os/shared';
import {
  CreateEnrollmentUseCase,
  CreateInstituteMembershipUseCase,
  CreateSubjectUseCase,
  PrismaBatchRepository,
  PrismaEnrollmentRepository,
  PrismaInstituteMembershipRepository,
  PrismaStudentRepository,
  PrismaSubjectRepository,
  WithdrawEnrollmentUseCase,
  type TenantContext,
} from '@coaching-os/identity';
import { PrismaScheduleRepository } from '../../infrastructure/repositories/prisma-schedule.repository';
import { PrismaBatchSessionRepository } from '../../infrastructure/repositories/prisma-batch-session.repository';
import { PrismaAttendanceRepository } from '../../infrastructure/repositories/prisma-attendance.repository';
import {
  CreateScheduleUseCase,
  GenerateBatchSessionsUseCase,
} from './scheduling.use-cases';
import {
  GetSessionAttendanceUseCase,
  RecordSessionAttendanceUseCase,
} from './attendance.use-cases';

describe('Phase 2.2 — Session Attendance Core Integration & Security Suite', () => {
  let membershipRepo: PrismaInstituteMembershipRepository;
  let subjectRepo: PrismaSubjectRepository;
  let batchRepo: PrismaBatchRepository;
  let scheduleRepo: PrismaScheduleRepository;
  let sessionRepo: PrismaBatchSessionRepository;
  let enrollmentRepo: PrismaEnrollmentRepository;
  let studentRepo: PrismaStudentRepository;
  let attendanceRepo: PrismaAttendanceRepository;

  let createMembershipUseCase: CreateInstituteMembershipUseCase;
  let createSubjectUseCase: CreateSubjectUseCase;
  let withdrawEnrollmentUseCase: WithdrawEnrollmentUseCase;

  let createScheduleUseCase: CreateScheduleUseCase;
  let generateSessionsUseCase: GenerateBatchSessionsUseCase;

  let recordAttendanceUseCase: RecordSessionAttendanceUseCase;
  let getAttendanceUseCase: GetSessionAttendanceUseCase;

  // Institute A (Owner & Batch A)
  let ownerContextA: TenantContext;
  let batchAId: string;
  let sessionAId: string;
  let enrollmentA1Id: string;
  let enrollmentA2Id: string;

  // Batch A2 in Institute A (Second Batch)
  let batchA2Id: string;
  let enrollmentA2OtherBatchId: string;

  // Institute B (Adversarial Tenant)
  let ownerContextB: TenantContext;
  let batchBId: string;
  let sessionBId: string;
  let enrollmentBId: string;

  beforeEach(async () => {
    validateTestEnvironment();
    await cleanTestDatabase();

    membershipRepo = new PrismaInstituteMembershipRepository();
    subjectRepo = new PrismaSubjectRepository();
    batchRepo = new PrismaBatchRepository();
    scheduleRepo = new PrismaScheduleRepository();
    sessionRepo = new PrismaBatchSessionRepository();
    enrollmentRepo = new PrismaEnrollmentRepository();
    studentRepo = new PrismaStudentRepository();
    attendanceRepo = new PrismaAttendanceRepository();

    createMembershipUseCase = new CreateInstituteMembershipUseCase(membershipRepo);
    createSubjectUseCase = new CreateSubjectUseCase(subjectRepo);
    withdrawEnrollmentUseCase = new WithdrawEnrollmentUseCase(enrollmentRepo);

    createScheduleUseCase = new CreateScheduleUseCase(scheduleRepo, batchRepo, membershipRepo);
    generateSessionsUseCase = new GenerateBatchSessionsUseCase(batchRepo, scheduleRepo, sessionRepo);

    recordAttendanceUseCase = new RecordSessionAttendanceUseCase(
      attendanceRepo,
      sessionRepo,
      enrollmentRepo,
    );
    getAttendanceUseCase = new GetSessionAttendanceUseCase(attendanceRepo, sessionRepo);

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

    // Batch A1 (Status open)
    const batchA1 = await createTestBatch(instA.id, subjectA.id, {
      name: 'Batch Alpha 2026',
      code: 'PHY-ALPHA-26',
    });
    batchAId = batchA1.id;

    // Batch A2 (Same institute, different batch, status open)
    const batchA2 = await createTestBatch(instA.id, subjectA.id, {
      name: 'Batch Beta 2026',
      code: 'PHY-BETA-26',
    });
    batchA2Id = batchA2.id;

    // Create Schedule & Generate Session for Batch A1
    await createScheduleUseCase.execute(ownerContextA, {
      batchId: batchAId,
      dayOfWeek: 'monday',
      startTime: '17:00',
      endTime: '18:30',
    });

    const sessionsA = await generateSessionsUseCase.execute(ownerContextA, {
      batchId: batchAId,
      startDate: '2026-08-17',
      endDate: '2026-08-17',
    });
    sessionAId = sessionsA[0].id;

    // Create Students & Active Enrollments in Batch A1
    const student1 = await createTestStudent(instA.id, { firstName: 'Alice', lastName: 'Smith' });
    const student2 = await createTestStudent(instA.id, { firstName: 'Bob', lastName: 'Jones' });

    const enr1 = await createTestEnrollment(student1.id, batchAId, { status: 'active' });
    enrollmentA1Id = enr1.id;

    const enr2 = await createTestEnrollment(student2.id, batchAId, { status: 'active' });
    enrollmentA2Id = enr2.id;

    // Create Student & Active Enrollment in Batch A2
    const studentA2Other = await createTestStudent(instA.id, { firstName: 'Charlie', lastName: 'Brown' });
    const enrA2Other = await createTestEnrollment(studentA2Other.id, batchA2Id, { status: 'active' });
    enrollmentA2OtherBatchId = enrA2Other.id;

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

    await createScheduleUseCase.execute(ownerContextB, {
      batchId: batchBId,
      dayOfWeek: 'monday',
      startTime: '17:00',
      endTime: '18:30',
    });

    const sessionsB = await generateSessionsUseCase.execute(ownerContextB, {
      batchId: batchBId,
      startDate: '2026-08-17',
      endDate: '2026-08-17',
    });
    sessionBId = sessionsB[0].id;

    const studentB = await createTestStudent(instB.id, { firstName: 'David', lastName: 'Miller' });
    const enrB = await createTestEnrollment(studentB.id, batchBId, { status: 'active' });
    enrollmentBId = enrB.id;
  });

  afterEach(async () => {
    await cleanTestDatabase();
  });

  describe('1. Basic Session Attendance Core Workflow', () => {
    it('should successfully record bulk attendance (present, absent, late) and mark session attendanceTaken = true', async () => {
      const result = await recordAttendanceUseCase.execute(ownerContextA, {
        sessionId: sessionAId,
        records: [
          { enrollmentId: enrollmentA1Id, status: 'present' },
          { enrollmentId: enrollmentA2Id, status: 'late' },
        ],
      });

      expect(result.length).toBe(2);
      expect(result.find((r) => r.enrollmentId === enrollmentA1Id)?.status).toBe('present');
      expect(result.find((r) => r.enrollmentId === enrollmentA2Id)?.status).toBe('late');

      // Verify BatchSession.attendanceTaken updated atomically in DB
      const updatedSession = await sessionRepo.findById(ownerContextA.instituteId, sessionAId);
      expect(updatedSession?.attendanceTaken).toBe(true);

      // Verify GetSessionAttendanceUseCase returns saved records
      const fetched = await getAttendanceUseCase.execute(ownerContextA, sessionAId);
      expect(fetched.length).toBe(2);
    });

    it('ATTENDANCE-002: should be strictly IDEMPOTENT: repeated attendance submissions MUST NOT create duplicate DB rows', async () => {
      // First submission
      await recordAttendanceUseCase.execute(ownerContextA, {
        sessionId: sessionAId,
        records: [
          { enrollmentId: enrollmentA1Id, status: 'present' },
          { enrollmentId: enrollmentA2Id, status: 'absent' },
        ],
      });

      // Second submission with updated status for student 2
      await recordAttendanceUseCase.execute(ownerContextA, {
        sessionId: sessionAId,
        records: [
          { enrollmentId: enrollmentA1Id, status: 'present' },
          { enrollmentId: enrollmentA2Id, status: 'late' },
        ],
      });

      // Verify exact DB row count is still 2 (zero duplicate rows)
      const fetched = await attendanceRepo.findBySessionId(ownerContextA.instituteId, sessionAId);
      expect(fetched.length).toBe(2);
      expect(fetched.find((r) => r.enrollmentId === enrollmentA2Id)?.status).toBe('late');
    });
  });

  describe('2. Invariant Validation & Error Protection', () => {
    it('ACADEMIC-009: should reject recording attendance for a cancelled session', async () => {
      // Cancel session A
      const session = await sessionRepo.findById(ownerContextA.instituteId, sessionAId);
      session!.cancel();
      await sessionRepo.update(session!);

      await expect(
        recordAttendanceUseCase.execute(ownerContextA, {
          sessionId: sessionAId,
          records: [{ enrollmentId: enrollmentA1Id, status: 'present' }],
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('ACADEMIC-005: should reject enrollment belonging to a different batch in the same institute', async () => {
      await expect(
        recordAttendanceUseCase.execute(ownerContextA, {
          sessionId: sessionAId, // Belongs to Batch A1
          records: [
            { enrollmentId: enrollmentA1Id, status: 'present' },
            { enrollmentId: enrollmentA2OtherBatchId, status: 'present' }, // Belongs to Batch A2
          ],
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('ACADEMIC-008: should reject inactive / withdrawn enrollment from receiving attendance', async () => {
      // Withdraw enrollment A2
      await withdrawEnrollmentUseCase.execute(ownerContextA, {
        id: enrollmentA2Id,
      });

      await expect(
        recordAttendanceUseCase.execute(ownerContextA, {
          sessionId: sessionAId,
          records: [
            { enrollmentId: enrollmentA1Id, status: 'present' },
            { enrollmentId: enrollmentA2Id, status: 'present' },
          ],
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should reject payload containing duplicate enrollment IDs', async () => {
      await expect(
        recordAttendanceUseCase.execute(ownerContextA, {
          sessionId: sessionAId,
          records: [
            { enrollmentId: enrollmentA1Id, status: 'present' },
            { enrollmentId: enrollmentA1Id, status: 'absent' }, // Duplicate enrollment ID
          ],
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('3. ATTENDANCE-001: Bulk Atomicity Guarantees', () => {
    it('should perform ZERO writes if any single item in a bulk attendance payload is invalid', async () => {
      await expect(
        recordAttendanceUseCase.execute(ownerContextA, {
          sessionId: sessionAId,
          records: [
            { enrollmentId: enrollmentA1Id, status: 'present' },
            { enrollmentId: enrollmentA2OtherBatchId, status: 'present' }, // Invalid cross-batch enrollment
          ],
        }),
      ).rejects.toThrow(ValidationError);

      // Verify ZERO records written in DB
      const dbRecords = await attendanceRepo.findBySessionId(ownerContextA.instituteId, sessionAId);
      expect(dbRecords.length).toBe(0);

      // Verify session.attendanceTaken remains false
      const session = await sessionRepo.findById(ownerContextA.instituteId, sessionAId);
      expect(session?.attendanceTaken).toBe(false);
    });
  });

  describe('4. Adversarial Multi-Tenant Security Suite', () => {
    it('ATTENDANCE-SEC-01: should reject unauthenticated request lacking ACADEMIC_WRITE capability', async () => {
      const parentContext: TenantContext = {
        userId: crypto.randomUUID(),
        instituteId: ownerContextA.instituteId,
        membershipId: crypto.randomUUID(),
        role: 'parent',
        status: 'active',
      };

      await expect(
        recordAttendanceUseCase.execute(parentContext, {
          sessionId: sessionAId,
          records: [{ enrollmentId: enrollmentA1Id, status: 'present' }],
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('ATTENDANCE-SEC-02: should reject Institute B attempting to submit attendance for Institute A session', async () => {
      await expect(
        recordAttendanceUseCase.execute(ownerContextB, {
          sessionId: sessionAId, // Session belongs to Institute A
          records: [{ enrollmentId: enrollmentBId, status: 'present' }],
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('ATTENDANCE-SEC-03: should reject Institute A attempting to submit enrollment from Institute B', async () => {
      await expect(
        recordAttendanceUseCase.execute(ownerContextA, {
          sessionId: sessionAId,
          records: [{ enrollmentId: enrollmentBId, status: 'present' }], // Enrollment belongs to Institute B
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('ATTENDANCE-SEC-04: should return NotFound when Institute B attempts to read attendance of Institute A session', async () => {
      // First record attendance in Institute A
      await recordAttendanceUseCase.execute(ownerContextA, {
        sessionId: sessionAId,
        records: [{ enrollmentId: enrollmentA1Id, status: 'present' }],
      });

      // Attempt read from Institute B context
      await expect(
        getAttendanceUseCase.execute(ownerContextB, sessionAId),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
