import { db } from '@coaching-os/database';
import { ConflictError, ValidationError } from '@coaching-os/shared';
import { ProgramSubjectEntity } from '../../domain/entities/program-subject.entity';
import type { ProgramSubjectRepository } from '../../domain/repositories/program-subject.repository';

export class PrismaProgramSubjectRepository implements ProgramSubjectRepository {
  public async create(entity: ProgramSubjectEntity): Promise<ProgramSubjectEntity> {
    try {
      const record = await db.programSubject.create({
        data: {
          id: entity.id,
          instituteId: entity.instituteId,
          programId: entity.programId,
          subjectId: entity.subjectId,
          createdAt: entity.createdAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `Program "${entity.programId}" is already mapped to subject "${entity.subjectId}" in institute "${entity.instituteId}".`,
        );
      }
      if (error?.code === 'P2003') {
        throw new ValidationError(
          `Foreign key constraint failure: Program, Subject, or Institute reference does not exist.`,
        );
      }
      throw error;
    }
  }

  public async findById(instituteId: string, id: string): Promise<ProgramSubjectEntity | null> {
    if (!instituteId || !id) return null;

    const record = await db.programSubject.findFirst({
      where: { id, instituteId },
    });

    if (!record) return null;
    return this.toDomainEntity(record);
  }

  public async findByPair(
    instituteId: string,
    programId: string,
    subjectId: string,
  ): Promise<ProgramSubjectEntity | null> {
    if (!instituteId || !programId || !subjectId) return null;

    const record = await db.programSubject.findUnique({
      where: {
        program_subject_unique: {
          instituteId,
          programId,
          subjectId,
        },
      },
    });

    if (!record) return null;
    return this.toDomainEntity(record);
  }

  public async listByInstituteId(instituteId: string): Promise<ProgramSubjectEntity[]> {
    if (!instituteId) return [];

    const records = await db.programSubject.findMany({
      where: { instituteId },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  public async listByProgramId(
    instituteId: string,
    programId: string,
  ): Promise<ProgramSubjectEntity[]> {
    if (!instituteId || !programId) return [];

    const records = await db.programSubject.findMany({
      where: { instituteId, programId },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  public async listBySubjectId(
    instituteId: string,
    subjectId: string,
  ): Promise<ProgramSubjectEntity[]> {
    if (!instituteId || !subjectId) return [];

    const records = await db.programSubject.findMany({
      where: { instituteId, subjectId },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  public async deleteByPair(
    instituteId: string,
    programId: string,
    subjectId: string,
  ): Promise<boolean> {
    if (!instituteId || !programId || !subjectId) return false;

    const existing = await this.findByPair(instituteId, programId, subjectId);
    if (!existing) return false;

    await db.programSubject.delete({
      where: {
        program_subject_unique: {
          instituteId,
          programId,
          subjectId,
        },
      },
    });

    return true;
  }

  public async existsByPair(
    instituteId: string,
    programId: string,
    subjectId: string,
  ): Promise<boolean> {
    if (!instituteId || !programId || !subjectId) return false;

    const count = await db.programSubject.count({
      where: {
        instituteId,
        programId,
        subjectId,
      },
    });

    return count > 0;
  }

  private toDomainEntity(record: {
    id: string;
    instituteId: string;
    programId: string;
    subjectId: string;
    createdAt: Date;
  }): ProgramSubjectEntity {
    return ProgramSubjectEntity.from({
      id: record.id,
      instituteId: record.instituteId,
      programId: record.programId,
      subjectId: record.subjectId,
      createdAt: record.createdAt,
    });
  }
}
