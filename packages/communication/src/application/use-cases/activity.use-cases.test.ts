import { describe, it, expect, beforeEach } from 'vitest';
import { AuthorizationError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { ActivityEntity } from '../../domain/entities/activity.entity';
import type { ActivityRepository, ListStudentActivitiesParams } from '../../domain/repositories/activity.repository';
import {
  GetActivityUseCase,
  ListStudentActivitiesUseCase,
  ProjectActivityUseCase,
  ActivityProjectionService,
} from './activity.use-cases';

class InMemoryActivityRepository implements ActivityRepository {
  public activities: ActivityEntity[] = [];

  public async save(activity: ActivityEntity): Promise<ActivityEntity> {
    const index = this.activities.findIndex(
      (a) =>
        a.id === activity.id ||
        (a.instituteId === activity.instituteId &&
          a.studentId === activity.studentId &&
          a.idempotencyKey &&
          a.idempotencyKey === activity.idempotencyKey),
    );
    if (index >= 0) {
      return this.activities[index];
    }
    this.activities.push(activity);
    return activity;
  }

  public async findById(instituteId: string, studentId: string, id: string): Promise<ActivityEntity | null> {
    return (
      this.activities.find(
        (a) => a.instituteId === instituteId && a.studentId === studentId && a.id === id,
      ) ?? null
    );
  }

  public async findManyForStudent(
    params: ListStudentActivitiesParams,
  ): Promise<{ items: ActivityEntity[]; nextCursor: string | null }> {
    let filtered = this.activities.filter(
      (a) => a.instituteId === params.instituteId && a.studentId === params.studentId,
    );

    if (params.eventType) {
      filtered = filtered.filter((a) => a.eventType === params.eventType);
    }

    filtered.sort((a, b) => {
      const timeDiff = b.occurredAt.getTime() - a.occurredAt.getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.id.localeCompare(a.id);
    });

    const limit = params.limit ?? 20;
    const items = filtered.slice(0, limit);
    const nextCursor = filtered.length > limit ? items[items.length - 1].id : null;

    return { items, nextCursor };
  }

  public async findBySourceIdempotencyKey(
    instituteId: string,
    studentId: string,
    idempotencyKey: string,
  ): Promise<ActivityEntity | null> {
    return (
      this.activities.find(
        (a) =>
          a.instituteId === instituteId &&
          a.studentId === studentId &&
          a.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }
}

describe('Activity Use Cases Unit Tests', () => {
  let repo: InMemoryActivityRepository;
  let getActivityUseCase: GetActivityUseCase;
  let listActivitiesUseCase: ListStudentActivitiesUseCase;
  let projectActivityUseCase: ProjectActivityUseCase;
  let projectionService: ActivityProjectionService;

  const validCaps = new Set(['activity:read', 'activity:manage']);

  beforeEach(() => {
    repo = new InMemoryActivityRepository();
    getActivityUseCase = new GetActivityUseCase(repo);
    listActivitiesUseCase = new ListStudentActivitiesUseCase(repo);
    projectActivityUseCase = new ProjectActivityUseCase(repo);
    projectionService = new ActivityProjectionService(projectActivityUseCase);
  });

  describe('GetActivityUseCase', () => {
    it('1. Retrieves single activity for valid institute + student', async () => {
      const entity = ActivityEntity.create({
        id: '123e4567-e89b-12d3-a456-426614174000',
        instituteId: 'inst_1',
        studentId: 'stud_1',
        eventType: 'attendance_absent',
        title: 'Absent',
        description: 'Student absent',
        occurredAt: new Date(),
        createdAt: new Date(),
      });
      await repo.save(entity);

      const dto = await getActivityUseCase.execute({
        instituteId: 'inst_1',
        studentId: 'stud_1',
        activityId: entity.id,
        userCapabilities: validCaps,
      });

      expect(dto.id).toBe(entity.id);
      expect(dto.title).toBe('Absent');
    });

    it('2. Throws AuthorizationError if activity:read capability missing', async () => {
      await expect(
        getActivityUseCase.execute({
          instituteId: 'inst_1',
          studentId: 'stud_1',
          activityId: 'act_1',
          userCapabilities: new Set(),
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('3. Throws NotFoundError when accessing activity in another institute (404 masking)', async () => {
      const entity = ActivityEntity.create({
        id: 'act_foreign',
        instituteId: 'inst_A',
        studentId: 'stud_A',
        eventType: 'homework_assigned',
        title: 'Homework',
        description: 'Desc',
        occurredAt: new Date(),
        createdAt: new Date(),
      });
      await repo.save(entity);

      await expect(
        getActivityUseCase.execute({
          instituteId: 'inst_B',
          studentId: 'stud_A',
          activityId: 'act_foreign',
          userCapabilities: validCaps,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('4. Throws NotFoundError when accessing activity of another student in same institute', async () => {
      const entity = ActivityEntity.create({
        id: 'act_student1',
        instituteId: 'inst_A',
        studentId: 'stud_1',
        eventType: 'test_result',
        title: 'Test',
        description: 'Desc',
        occurredAt: new Date(),
        createdAt: new Date(),
      });
      await repo.save(entity);

      await expect(
        getActivityUseCase.execute({
          instituteId: 'inst_A',
          studentId: 'stud_2',
          activityId: 'act_student1',
          userCapabilities: validCaps,
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('ListStudentActivitiesUseCase', () => {
    it('5. Lists activities sorted newest first', async () => {
      const act1 = ActivityEntity.create({
        id: 'act_1',
        instituteId: 'inst_1',
        studentId: 'stud_1',
        eventType: 'attendance_absent',
        title: 'Absent Day 1',
        description: 'Desc',
        occurredAt: new Date('2026-08-10T10:00:00Z'),
        createdAt: new Date(),
      });
      const act2 = ActivityEntity.create({
        id: 'act_2',
        instituteId: 'inst_1',
        studentId: 'stud_1',
        eventType: 'homework_assigned',
        title: 'Homework 2',
        description: 'Desc',
        occurredAt: new Date('2026-08-14T10:00:00Z'),
        createdAt: new Date(),
      });
      await repo.save(act1);
      await repo.save(act2);

      const res = await listActivitiesUseCase.execute({
        instituteId: 'inst_1',
        studentId: 'stud_1',
        userCapabilities: validCaps,
      });

      expect(res.items.length).toBe(2);
      expect(res.items[0].id).toBe('act_2'); // Newest first
      expect(res.items[1].id).toBe('act_1');
    });
  });

  describe('ProjectActivityUseCase & ProjectionService', () => {
    it('6. Projects attendance event idempotently', async () => {
      const dto1 = await projectionService.projectAttendanceRecorded({
        instituteId: 'inst_1',
        studentId: 'stud_1',
        status: 'absent',
        sessionTitle: 'Physics 101',
        recordedBy: 'Prof. Verma',
        occurredAt: new Date('2026-08-14T09:00:00Z'),
        eventIdempotencyKey: 'att_evt_100',
      });

      const dto2 = await projectionService.projectAttendanceRecorded({
        instituteId: 'inst_1',
        studentId: 'stud_1',
        status: 'absent',
        sessionTitle: 'Physics 101',
        recordedBy: 'Prof. Verma',
        occurredAt: new Date('2026-08-14T09:00:00Z'),
        eventIdempotencyKey: 'att_evt_100',
      });

      expect(dto1.id).toBe(dto2.id);
      expect(repo.activities.length).toBe(1);
    });

    it('7. Rejects projection with missing instituteId or studentId', async () => {
      await expect(
        projectActivityUseCase.execute({
          instituteId: '',
          studentId: 'stud_1',
          eventType: 'announcement',
          title: 'Title',
          description: 'Desc',
          occurredAt: new Date(),
        }),
      ).rejects.toThrow(ValidationError);
    });
  });
});
