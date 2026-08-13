import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { ScheduleEntity } from './schedule.entity';
import { DayOfWeek } from '../value-objects/day-of-week.vo';
import { TimeOfDay } from '../value-objects/time-of-day.vo';

describe('ScheduleEntity Domain Entity', () => {
  it('should create valid ScheduleEntity with string or VO parameters', () => {
    const schedule = ScheduleEntity.create({
      batchId: 'batch-123',
      dayOfWeek: 'monday',
      startTime: '17:00',
      endTime: '18:30',
      teacherId: 'teacher-456',
    });

    expect(schedule.batchId).toBe('batch-123');
    expect(schedule.dayOfWeek.value).toBe('monday');
    expect(schedule.startTime.value).toBe('17:00');
    expect(schedule.endTime.value).toBe('18:30');
    expect(schedule.teacherId).toBe('teacher-456');
  });

  it('should throw ValidationError if startTime is not strictly before endTime', () => {
    expect(() =>
      ScheduleEntity.create({
        batchId: 'batch-123',
        dayOfWeek: 'monday',
        startTime: '18:30',
        endTime: '17:00',
      }),
    ).toThrow(ValidationError);

    expect(() =>
      ScheduleEntity.create({
        batchId: 'batch-123',
        dayOfWeek: 'monday',
        startTime: '17:00',
        endTime: '17:00',
      }),
    ).toThrow(ValidationError);
  });

  it('should throw ValidationError if batchId is empty', () => {
    expect(() =>
      ScheduleEntity.create({
        batchId: '   ',
        dayOfWeek: 'monday',
        startTime: '17:00',
        endTime: '18:30',
      }),
    ).toThrow(ValidationError);
  });

  it('should update schedule properties correctly', () => {
    const schedule = ScheduleEntity.create({
      batchId: 'batch-123',
      dayOfWeek: 'monday',
      startTime: '17:00',
      endTime: '18:30',
    });

    schedule.update({
      dayOfWeek: 'tuesday',
      startTime: '18:00',
      endTime: '19:30',
    });

    expect(schedule.dayOfWeek.value).toBe('tuesday');
    expect(schedule.startTime.value).toBe('18:00');
    expect(schedule.endTime.value).toBe('19:30');
  });
});
