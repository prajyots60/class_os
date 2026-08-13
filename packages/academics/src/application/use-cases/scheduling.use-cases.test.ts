import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanTestDatabase, createTestUser, validateTestEnvironment } from '@coaching-os/database';
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@coaching-os/shared';
import {
  CreateBatchUseCase,
  CreateInstituteUseCase,
  CreateInstituteMembershipUseCase,
  CreateSubjectUseCase,
  PrismaBatchRepository,
  PrismaInstituteMembershipRepository,
  PrismaInstituteRepository,
  PrismaSubjectRepository,
  type TenantContext,
} from '@coaching-os/identity';
import { PrismaScheduleRepository } from '../../infrastructure/repositories/prisma-schedule.repository';
import { PrismaBatchSessionRepository } from '../../infrastructure/repositories/prisma-batch-session.repository';
import {
  CancelBatchSessionUseCase,
  CompleteBatchSessionUseCase,
  CreateScheduleUseCase,
  GenerateBatchSessionsUseCase,
  ListBatchSessionsUseCase,
  ListSchedulesForBatchUseCase,
  UpdateScheduleUseCase,
} from './scheduling.use-cases';

describe('Phase 2.1 — Scheduling & Session Engine Integration & Security Suite', () => {
  let instituteRepo: PrismaInstituteRepository;
  let membershipRepo: PrismaInstituteMembershipRepository;
  let subjectRepo: PrismaSubjectRepository;
  let batchRepo: PrismaBatchRepository;
  let scheduleRepo: PrismaScheduleRepository;
  let sessionRepo: PrismaBatchSessionRepository;

  let createInstituteUseCase: CreateInstituteUseCase;
  let createMembershipUseCase: CreateInstituteMembershipUseCase;
  let createSubjectUseCase: CreateSubjectUseCase;
  let createBatchUseCase: CreateBatchUseCase;

  let createScheduleUseCase: CreateScheduleUseCase;
  let updateScheduleUseCase: UpdateScheduleUseCase;
  let generateSessionsUseCase: GenerateBatchSessionsUseCase;
  let completeSessionUseCase: CompleteBatchSessionUseCase;
  let cancelSessionUseCase: CancelBatchSessionUseCase;
  let listSessionsUseCase: ListBatchSessionsUseCase;

  // Institute A test context (Owner & Teacher)
  let ownerContextA: TenantContext;
  let teacherContextA: TenantContext;
  let batchAId: string;
  let teacherAUserId: string;

  // Institute B test context (Adversarial Tenant)
  let ownerContextB: TenantContext;
  let batchBId: string;

  beforeEach(async () => {
    validateTestEnvironment();
    await cleanTestDatabase();

    instituteRepo = new PrismaInstituteRepository();
    membershipRepo = new PrismaInstituteMembershipRepository();
    subjectRepo = new PrismaSubjectRepository();
    batchRepo = new PrismaBatchRepository();
    scheduleRepo = new PrismaScheduleRepository();
    sessionRepo = new PrismaBatchSessionRepository();

    createInstituteUseCase = new CreateInstituteUseCase(instituteRepo);
    createMembershipUseCase = new CreateInstituteMembershipUseCase(membershipRepo);
    createSubjectUseCase = new CreateSubjectUseCase(subjectRepo);
    createBatchUseCase = new CreateBatchUseCase(batchRepo, subjectRepo);

    createScheduleUseCase = new CreateScheduleUseCase(scheduleRepo, batchRepo, membershipRepo);
    updateScheduleUseCase = new UpdateScheduleUseCase(scheduleRepo, batchRepo, membershipRepo);
    generateSessionsUseCase = new GenerateBatchSessionsUseCase(batchRepo, scheduleRepo, sessionRepo);
    completeSessionUseCase = new CompleteBatchSessionUseCase(sessionRepo);
    cancelSessionUseCase = new CancelBatchSessionUseCase(sessionRepo);
    listSessionsUseCase = new ListBatchSessionsUseCase(batchRepo, sessionRepo);

    // Setup Institute A
    const instA = await createInstituteUseCase.execute({
      name: 'Apex Academy A',
      slug: 'apex-academy-a',
      phone: '+919876543210',
      email: 'owner@apex-a.com',
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

    const userTeacherA = await createTestUser();
    teacherAUserId = userTeacherA.id;
    const teacherMemA = await createMembershipUseCase.execute({
      userId: userTeacherA.id,
      instituteId: instA.id,
      role: 'teacher',
    });

    teacherContextA = {
      userId: userTeacherA.id,
      instituteId: instA.id,
      membershipId: teacherMemA.id,
      role: 'teacher',
      status: 'active',
    };

    const subjectA = await createSubjectUseCase.execute(ownerContextA, {
      name: 'Physics',
      code: 'PHY-101',
    });

    const batchA = await createBatchUseCase.execute(ownerContextA, {
      subjectId: subjectA.id,
      name: 'Batch Alpha 2026',
      code: 'PHY-ALPHA-26',
    });
    batchAId = batchA.id;

    // Setup Institute B (Adversarial Tenant)
    const instB = await createInstituteUseCase.execute({
      name: 'Beta Institute B',
      slug: 'beta-institute-b',
      phone: '+919876543211',
      email: 'owner@beta-b.com',
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

    const batchB = await createBatchUseCase.execute(ownerContextB, {
      subjectId: subjectB.id,
      name: 'Batch Beta 2026',
      code: 'CHE-BETA-26',
    });
    batchBId = batchB.id;
  });

  afterEach(async () => {
    await cleanTestDatabase();
  });

  describe('Schedule Creation & Validation Invariants', () => {
    it('should create a valid weekly recurring schedule', async () => {
      const schedule = await createScheduleUseCase.execute(ownerContextA, {
        batchId: batchAId,
        dayOfWeek: 'monday',
        startTime: '17:00',
        endTime: '18:30',
        teacherId: teacherAUserId,
      });

      expect(schedule.id).toBeDefined();
      expect(schedule.batchId).toBe(batchAId);
      expect(schedule.dayOfWeek).toBe('monday');
      expect(schedule.startTime).toBe('17:00');
      expect(schedule.endTime).toBe('18:30');
      expect(schedule.teacherId).toBe(teacherAUserId);
    });

    it('should reject schedule creation if startTime is not strictly before endTime', async () => {
      await expect(
        createScheduleUseCase.execute(ownerContextA, {
          batchId: batchAId,
          dayOfWeek: 'monday',
          startTime: '18:30',
          endTime: '17:00',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should reject assigning a teacher from another institute (Cross-Tenant Teacher Protection)', async () => {
      const userTeacherB = await createTestUser();
      await createMembershipUseCase.execute({
        userId: userTeacherB.id,
        instituteId: ownerContextB.instituteId,
        role: 'teacher',
      });

      await expect(
        createScheduleUseCase.execute(ownerContextA, {
          batchId: batchAId,
          dayOfWeek: 'monday',
          startTime: '17:00',
          endTime: '18:30',
          teacherId: userTeacherB.id,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should reject creating a schedule for a batch in another institute (Cross-Tenant Batch Protection)', async () => {
      await expect(
        createScheduleUseCase.execute(ownerContextA, {
          batchId: batchBId, // Batch belongs to Institute B
          dayOfWeek: 'monday',
          startTime: '17:00',
          endTime: '18:30',
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Session Generation Engine & Idempotency', () => {
    it('should generate expected sessions across date range for multiple schedules (Mon & Wed)', async () => {
      // Create Monday schedule
      await createScheduleUseCase.execute(ownerContextA, {
        batchId: batchAId,
        dayOfWeek: 'monday',
        startTime: '17:00',
        endTime: '18:30',
      });

      // Create Wednesday schedule
      await createScheduleUseCase.execute(ownerContextA, {
        batchId: batchAId,
        dayOfWeek: 'wednesday',
        startTime: '17:00',
        endTime: '18:30',
      });

      // Generate sessions from Aug 17 (Mon) to Aug 31 (Mon), 2026
      const sessions = await generateSessionsUseCase.execute(ownerContextA, {
        batchId: batchAId,
        startDate: '2026-08-17',
        endDate: '2026-08-31',
      });

      // Mon Aug 17, Wed Aug 19, Mon Aug 24, Wed Aug 26, Mon Aug 31 = 5 sessions
      expect(sessions.length).toBe(5);
      expect(sessions.map((s) => s.date)).toEqual([
        '2026-08-17',
        '2026-08-19',
        '2026-08-24',
        '2026-08-26',
        '2026-08-31',
      ]);
      expect(sessions.every((s) => s.status === 'scheduled')).toBe(true);
      expect(sessions.every((s) => s.attendanceTaken === false)).toBe(true);
    });

    it('should be strictly IDEMPOTENT: repeated generation calls MUST NOT create duplicate sessions', async () => {
      await createScheduleUseCase.execute(ownerContextA, {
        batchId: batchAId,
        dayOfWeek: 'monday',
        startTime: '17:00',
        endTime: '18:30',
      });

      // First call
      const firstRun = await generateSessionsUseCase.execute(ownerContextA, {
        batchId: batchAId,
        startDate: '2026-08-17',
        endDate: '2026-08-31',
      });
      expect(firstRun.length).toBe(3);

      // Second call with same parameters
      const secondRun = await generateSessionsUseCase.execute(ownerContextA, {
        batchId: batchAId,
        startDate: '2026-08-17',
        endDate: '2026-08-31',
      });
      expect(secondRun.length).toBe(3);

      // Verify exact session IDs match (zero duplicate creation)
      expect(secondRun.map((s) => s.id)).toEqual(firstRun.map((s) => s.id));

      // Query database directly to confirm total DB count is exactly 3
      const dbSessions = await sessionRepo.listByBatch(ownerContextA.instituteId, batchAId);
      expect(dbSessions.length).toBe(3);
    });

    it('SCHEDULE-007: Modifying schedule rules MUST NOT rewrite previously generated historical BatchSessions', async () => {
      // 1. Create Monday schedule & generate session for Aug 17
      const sched = await createScheduleUseCase.execute(ownerContextA, {
        batchId: batchAId,
        dayOfWeek: 'monday',
        startTime: '17:00',
        endTime: '18:30',
      });

      const originalSessions = await generateSessionsUseCase.execute(ownerContextA, {
        batchId: batchAId,
        startDate: '2026-08-17',
        endDate: '2026-08-17',
      });
      expect(originalSessions.length).toBe(1);
      expect(originalSessions[0].date).toBe('2026-08-17');
      expect(originalSessions[0].startTime).toBe('17:00');

      // 2. Update schedule to Tuesday at 18:00
      await updateScheduleUseCase.execute(ownerContextA, {
        scheduleId: sched.id,
        batchId: batchAId,
        dayOfWeek: 'tuesday',
        startTime: '18:00',
        endTime: '19:30',
      });

      // 3. Verify original Aug 17 session is UNCHANGED in database
      const historicalSession = await sessionRepo.findById(
        ownerContextA.instituteId,
        originalSessions[0].id,
      );
      expect(historicalSession).not.toBeNull();
      expect(historicalSession?.date.toISOString().slice(0, 10)).toBe('2026-08-17');
      expect(historicalSession?.startTime?.value).toBe('17:00');

      // 4. Generate future sessions for Aug 18 to Aug 25
      const futureSessions = await generateSessionsUseCase.execute(ownerContextA, {
        batchId: batchAId,
        startDate: '2026-08-18',
        endDate: '2026-08-25',
      });

      // Tuesday Aug 18 & Tuesday Aug 25 generated with new schedule rule
      expect(futureSessions.length).toBe(2);
      expect(futureSessions[0].date).toBe('2026-08-18');
      expect(futureSessions[0].startTime).toBe('18:00');
    });
  });

  describe('Session State Machine Transitions', () => {
    it('should complete a scheduled session (scheduled -> completed)', async () => {
      await createScheduleUseCase.execute(ownerContextA, {
        batchId: batchAId,
        dayOfWeek: 'monday',
        startTime: '17:00',
        endTime: '18:30',
      });

      const sessions = await generateSessionsUseCase.execute(ownerContextA, {
        batchId: batchAId,
        startDate: '2026-08-17',
        endDate: '2026-08-17',
      });

      const completed = await completeSessionUseCase.execute(ownerContextA, sessions[0].id);
      expect(completed.status).toBe('completed');
    });

    it('should cancel a scheduled session (scheduled -> cancelled)', async () => {
      await createScheduleUseCase.execute(ownerContextA, {
        batchId: batchAId,
        dayOfWeek: 'monday',
        startTime: '17:00',
        endTime: '18:30',
      });

      const sessions = await generateSessionsUseCase.execute(ownerContextA, {
        batchId: batchAId,
        startDate: '2026-08-17',
        endDate: '2026-08-17',
      });

      const cancelled = await cancelSessionUseCase.execute(ownerContextA, sessions[0].id);
      expect(cancelled.status).toBe('cancelled');
    });

    it('should reject completing an already cancelled session', async () => {
      await createScheduleUseCase.execute(ownerContextA, {
        batchId: batchAId,
        dayOfWeek: 'monday',
        startTime: '17:00',
        endTime: '18:30',
      });

      const sessions = await generateSessionsUseCase.execute(ownerContextA, {
        batchId: batchAId,
        startDate: '2026-08-17',
        endDate: '2026-08-17',
      });

      await cancelSessionUseCase.execute(ownerContextA, sessions[0].id);

      await expect(
        completeSessionUseCase.execute(ownerContextA, sessions[0].id),
      ).rejects.toThrow(ValidationError);
    });

    it('should reject cancelling an already completed session', async () => {
      await createScheduleUseCase.execute(ownerContextA, {
        batchId: batchAId,
        dayOfWeek: 'monday',
        startTime: '17:00',
        endTime: '18:30',
      });

      const sessions = await generateSessionsUseCase.execute(ownerContextA, {
        batchId: batchAId,
        startDate: '2026-08-17',
        endDate: '2026-08-17',
      });

      await completeSessionUseCase.execute(ownerContextA, sessions[0].id);

      await expect(
        cancelSessionUseCase.execute(ownerContextA, sessions[0].id),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Adversarial Multi-Tenant Security Tests', () => {
    it('should reject Institute B user attempting to generate sessions for Institute A batch', async () => {
      await createScheduleUseCase.execute(ownerContextA, {
        batchId: batchAId,
        dayOfWeek: 'monday',
        startTime: '17:00',
        endTime: '18:30',
      });

      await expect(
        generateSessionsUseCase.execute(ownerContextB, {
          batchId: batchAId, // Belongs to Institute A
          startDate: '2026-08-17',
          endDate: '2026-08-31',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should reject Institute B user attempting to complete session in Institute A', async () => {
      await createScheduleUseCase.execute(ownerContextA, {
        batchId: batchAId,
        dayOfWeek: 'monday',
        startTime: '17:00',
        endTime: '18:30',
      });

      const sessions = await generateSessionsUseCase.execute(ownerContextA, {
        batchId: batchAId,
        startDate: '2026-08-17',
        endDate: '2026-08-17',
      });

      await expect(
        completeSessionUseCase.execute(ownerContextB, sessions[0].id),
      ).rejects.toThrow(NotFoundError);
    });

    it('should reject unauthenticated request lacking valid capability', async () => {
      const unauthorizedContext: TenantContext = {
        userId: crypto.randomUUID(),
        instituteId: ownerContextA.instituteId,
        membershipId: crypto.randomUUID(),
        role: 'parent', // Parent role lacks ACADEMIC_WRITE capability
        status: 'active',
      };

      await expect(
        createScheduleUseCase.execute(unauthorizedContext, {
          batchId: batchAId,
          dayOfWeek: 'monday',
          startTime: '17:00',
          endTime: '18:30',
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });
});
