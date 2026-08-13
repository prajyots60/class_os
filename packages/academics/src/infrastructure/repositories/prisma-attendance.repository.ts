import { db } from '@coaching-os/database';
import { NotFoundError } from '@coaching-os/shared';
import { AttendanceEntity, type AttendanceStatus } from '../../domain/entities/attendance.entity';
import type { AttendanceRepository } from '../../domain/repositories/attendance.repository';

export class PrismaAttendanceRepository implements AttendanceRepository {
  public async findBySessionId(instituteId: string, sessionId: string): Promise<AttendanceEntity[]> {
    if (!instituteId || !sessionId) return [];

    // Verify session belongs to tenant
    const session = await db.batchSession.findFirst({
      where: { id: sessionId, instituteId },
    });

    if (!session) return [];

    const records = await db.attendance.findMany({
      where: { sessionId, instituteId },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((r) => this.toDomainEntity(r));
  }

  public async findBySessionAndEnrollment(
    instituteId: string,
    sessionId: string,
    enrollmentId: string,
  ): Promise<AttendanceEntity | null> {
    if (!instituteId || !sessionId || !enrollmentId) return null;

    const record = await db.attendance.findFirst({
      where: {
        sessionId,
        enrollmentId,
        instituteId,
      },
    });

    if (!record) return null;
    return this.toDomainEntity(record);
  }

  public async upsertMany(
    instituteId: string,
    sessionId: string,
    records: AttendanceEntity[],
  ): Promise<AttendanceEntity[]> {
    if (!instituteId || !sessionId) {
      throw new NotFoundError(`BatchSession with ID "${sessionId}" not found in institute.`);
    }

    return db.$transaction(async (tx) => {
      // 1. Verify session exists and belongs to target tenant
      const session = await tx.batchSession.findFirst({
        where: { id: sessionId, instituteId },
      });

      if (!session || session.instituteId !== instituteId) {
        throw new NotFoundError(`BatchSession with ID "${sessionId}" not found in institute.`);
      }

      // 2. Perform bulk upsert for attendance records
      const updatedEntities: AttendanceEntity[] = [];

      for (const recordEntity of records) {
        const record = await tx.attendance.upsert({
          where: {
            sessionId_enrollmentId: {
              sessionId,
              enrollmentId: recordEntity.enrollmentId,
            },
          },
          create: {
            id: recordEntity.id,
            instituteId,
            sessionId,
            enrollmentId: recordEntity.enrollmentId,
            status: recordEntity.status,
            createdAt: recordEntity.createdAt,
            updatedAt: recordEntity.updatedAt,
          },
          update: {
            status: recordEntity.status,
            updatedAt: new Date(),
          },
        });

        updatedEntities.push(this.toDomainEntity(record));
      }

      // 3. Atomically mark session attendanceTaken = true
      await tx.batchSession.update({
        where: { id: sessionId },
        data: {
          attendanceTaken: true,
        },
      });

      return updatedEntities;
    });
  }

  private toDomainEntity(record: {
    id: string;
    instituteId: string;
    sessionId: string;
    enrollmentId: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): AttendanceEntity {
    return AttendanceEntity.from({
      id: record.id,
      instituteId: record.instituteId,
      sessionId: record.sessionId,
      enrollmentId: record.enrollmentId,
      status: record.status as AttendanceStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
