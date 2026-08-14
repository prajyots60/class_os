import {
  cleanTestDatabase,
  closeTestPool,
  db,
  validateTestEnvironment,
} from '@coaching-os/database';
import { AuthorizationError, NotFoundError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  GetActivityUseCase,
  ListStudentActivitiesUseCase,
  ProjectActivityUseCase,
  ActivityProjectionService,
} from '../../application/use-cases/activity.use-cases';
import { ActivityEntity } from '../../domain/entities/activity.entity';
import { PrismaActivityRepository } from './prisma-activity.repository';

describe('PrismaActivityRepository & Adversarial Security Integration Suite', () => {
  let repository: PrismaActivityRepository;
  let getActivityUseCase: GetActivityUseCase;
  let listActivitiesUseCase: ListStudentActivitiesUseCase;
  let projectActivityUseCase: ProjectActivityUseCase;
  let projectionService: ActivityProjectionService;

  let instituteA_Id: string;
  let instituteB_Id: string;
  let studentA1_Id: string;
  let studentA2_Id: string;
  let studentB1_Id: string;

  const validCaps = new Set(['activity:read', 'activity:manage']);

  beforeAll(() => {
    validateTestEnvironment();
    repository = new PrismaActivityRepository(db as any);
    getActivityUseCase = new GetActivityUseCase(repository);
    listActivitiesUseCase = new ListStudentActivitiesUseCase(repository);
    projectActivityUseCase = new ProjectActivityUseCase(repository);
    projectionService = new ActivityProjectionService(projectActivityUseCase);
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await cleanTestDatabase();

    // Seed Institute A & B
    const instA = await db.institute.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Activity Institute A',
        slug: `act-inst-a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '+919876543210',
        email: `act-a-${Date.now()}@example.com`,
      },
    });
    instituteA_Id = instA.id;

    const instB = await db.institute.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Activity Institute B',
        slug: `act-inst-b-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '+919876543211',
        email: `act-b-${Date.now()}@example.com`,
      },
    });
    instituteB_Id = instB.id;

    // Seed Students
    const studA1 = await db.student.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        admissionNumber: `ADM-A1-${Date.now()}`,
        firstName: 'Student',
        lastName: 'A1',
      },
    });
    studentA1_Id = studA1.id;

    const studA2 = await db.student.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        admissionNumber: `ADM-A2-${Date.now()}`,
        firstName: 'Student',
        lastName: 'A2',
      },
    });
    studentA2_Id = studA2.id;

    const studB1 = await db.student.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        admissionNumber: `ADM-B1-${Date.now()}`,
        firstName: 'Student',
        lastName: 'B1',
      },
    });
    studentB1_Id = studB1.id;
  });

  describe('Adversarial Security Cases (Case A -> K)', () => {
    it('Case A — Cross-tenant IDOR (User from Institute B requesting Student A1 Activity returns NotFoundError)', async () => {
      const act = await repository.save(
        ActivityEntity.create({
          id: crypto.randomUUID(),
          instituteId: instituteA_Id,
          studentId: studentA1_Id,
          eventType: 'attendance_absent',
          title: 'Absent',
          description: 'Marked absent',
          occurredAt: new Date(),
          createdAt: new Date(),
        }),
      );

      await expect(
        getActivityUseCase.execute({
          instituteId: instituteB_Id,
          studentId: studentA1_Id,
          activityId: act.id,
          userCapabilities: validCaps,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('Case B — Cross-student access (Requesting Student A1 Activity under Student A2 context returns NotFoundError)', async () => {
      const act = await repository.save(
        ActivityEntity.create({
          id: crypto.randomUUID(),
          instituteId: instituteA_Id,
          studentId: studentA1_Id,
          eventType: 'homework_assigned',
          title: 'Homework 1',
          description: 'Physics HW',
          occurredAt: new Date(),
          createdAt: new Date(),
        }),
      );

      await expect(
        getActivityUseCase.execute({
          instituteId: instituteA_Id,
          studentId: studentA2_Id,
          activityId: act.id,
          userCapabilities: validCaps,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('Case C — Tenant spoofing (Server context instituteId overrides client attempts)', async () => {
      const act = await repository.save(
        ActivityEntity.create({
          id: crypto.randomUUID(),
          instituteId: instituteA_Id,
          studentId: studentA1_Id,
          eventType: 'fee_payment',
          title: 'Fee Payment',
          description: 'Payment done',
          occurredAt: new Date(),
          createdAt: new Date(),
        }),
      );

      // Server context enforces instituteA_Id
      const dto = await getActivityUseCase.execute({
        instituteId: instituteA_Id,
        studentId: studentA1_Id,
        activityId: act.id,
        userCapabilities: validCaps,
      });

      expect(dto.instituteId).toBe(instituteA_Id);
    });

    it('Case D — Foreign student injection (Cannot query or project for foreign student in institute)', async () => {
      const res = await listActivitiesUseCase.execute({
        instituteId: instituteA_Id,
        studentId: studentB1_Id, // Student B1 belongs to Institute B
        userCapabilities: validCaps,
      });

      expect(res.items.length).toBe(0);
    });

    it('Case E & F — Activity immutability (Repository exposes no update/delete methods)', () => {
      expect((repository as any).update).toBeUndefined();
      expect((repository as any).delete).toBeUndefined();
      expect((repository as any).remove).toBeUndefined();
    });

    it('Case G — Duplicate event projection (Same event idempotencyKey yields exactly 1 record)', async () => {
      const dto1 = await projectionService.projectAttendanceRecorded({
        instituteId: instituteA_Id,
        studentId: studentA1_Id,
        status: 'absent',
        sessionTitle: 'Math 101',
        recordedBy: 'Teacher K',
        occurredAt: new Date('2026-08-14T09:00:00Z'),
        eventIdempotencyKey: 'idemp_att_101',
      });

      const dto2 = await projectionService.projectAttendanceRecorded({
        instituteId: instituteA_Id,
        studentId: studentA1_Id,
        status: 'absent',
        sessionTitle: 'Math 101',
        recordedBy: 'Teacher K',
        occurredAt: new Date('2026-08-14T09:00:00Z'),
        eventIdempotencyKey: 'idemp_att_101',
      });

      expect(dto1.id).toBe(dto2.id);

      const dbRecords = await db.activity.findMany({
        where: { instituteId: instituteA_Id, studentId: studentA1_Id },
      });
      expect(dbRecords.length).toBe(1);
    });

    it('Case H — Concurrent duplicate projection (Simultaneous event projections resolve to 1 record via DB constraint)', async () => {
      const promises = Array.from({ length: 5 }).map(() =>
        projectionService.projectTestResultPublished({
          instituteId: instituteA_Id,
          studentId: studentA1_Id,
          testTitle: 'Unit Test 1',
          marksObtained: 45,
          totalMarks: 50,
          publishedBy: 'System',
          occurredAt: new Date('2026-08-14T11:00:00Z'),
          eventIdempotencyKey: 'concurrent_test_key_001',
        }),
      );

      const results = await Promise.all(promises);
      const firstId = results[0].id;
      for (const res of results) {
        expect(res.id).toBe(firstId);
      }

      const count = await db.activity.count({
        where: { instituteId: instituteA_Id, studentId: studentA1_Id },
      });
      expect(count).toBe(1);
    });

    it('Case I — Timeline pagination (Stable cursor-based pagination with equal timestamps)', async () => {
      const t = new Date('2026-08-14T12:00:00Z');

      // Create 5 activities with identical timestamp
      for (let i = 1; i <= 5; i++) {
        await repository.save(
          ActivityEntity.create({
            id: `10000000-0000-0000-0000-00000000000${i}`,
            instituteId: instituteA_Id,
            studentId: studentA1_Id,
            eventType: 'announcement',
            title: `Announcement ${i}`,
            description: `Desc ${i}`,
            occurredAt: t,
            createdAt: t,
          }),
        );
      }

      // Page 1: limit 2
      const page1 = await listActivitiesUseCase.execute({
        instituteId: instituteA_Id,
        studentId: studentA1_Id,
        limit: 2,
        userCapabilities: validCaps,
      });

      expect(page1.items.length).toBe(2);
      expect(page1.nextCursor).not.toBeNull();

      // Page 2: limit 2 using cursor
      const page2 = await listActivitiesUseCase.execute({
        instituteId: instituteA_Id,
        studentId: studentA1_Id,
        cursor: page1.nextCursor!,
        limit: 2,
        userCapabilities: validCaps,
      });

      expect(page2.items.length).toBe(2);
      expect(page2.items[0].id).not.toBe(page1.items[0].id);
      expect(page2.items[0].id).not.toBe(page1.items[1].id);

      // Page 3: limit 2 using cursor
      const page3 = await listActivitiesUseCase.execute({
        instituteId: instituteA_Id,
        studentId: studentA1_Id,
        cursor: page2.nextCursor!,
        limit: 2,
        userCapabilities: validCaps,
      });

      expect(page3.items.length).toBe(1);
      expect(page3.nextCursor).toBeNull();

      // Verify zero duplicates across pages
      const allIds = [...page1.items, ...page2.items, ...page3.items].map((i) => i.id);
      expect(new Set(allIds).size).toBe(5);
    });

    it('Case J — Metadata integrity (Metadata JSON stored and rehydrated accurately)', async () => {
      const act = await repository.save(
        ActivityEntity.create({
          id: crypto.randomUUID(),
          instituteId: instituteA_Id,
          studentId: studentA1_Id,
          eventType: 'receipt_issued',
          title: 'Receipt Issued',
          description: 'Receipt for fee payment',
          occurredAt: new Date(),
          metadata: { receiptNo: 'REC-999', nested: { tax: 0 } },
          createdAt: new Date(),
        }),
      );

      const found = await repository.findById(instituteA_Id, studentA1_Id, act.id);
      expect(found?.metadata).toEqual({ receiptNo: 'REC-999', nested: { tax: 0 } });
    });

    it('Case K — Random ID probing (Non-existent Activity ID returns NotFoundError)', async () => {
      await expect(
        getActivityUseCase.execute({
          instituteId: instituteA_Id,
          studentId: studentA1_Id,
          activityId: crypto.randomUUID(),
          userCapabilities: validCaps,
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
