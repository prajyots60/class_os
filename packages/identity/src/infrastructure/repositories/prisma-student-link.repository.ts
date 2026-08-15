import { db } from '@coaching-os/database';
import { ConflictError } from '@coaching-os/shared';
import { StudentLinkEntity } from '../../domain/entities/student-link.entity';
import type { StudentLinkRepository } from '../../domain/repositories/student-link.repository';

export class PrismaStudentLinkRepository implements StudentLinkRepository {
  private mapToEntity(record: {
    id: string;
    childProfileId: string;
    studentId: string;
    instituteId: string;
  }): StudentLinkEntity {
    return StudentLinkEntity.reconstruct({
      id: record.id,
      childProfileId: record.childProfileId,
      studentId: record.studentId,
      instituteId: record.instituteId,
    });
  }

  async create(link: StudentLinkEntity): Promise<StudentLinkEntity> {
    try {
      const record = await db.studentLink.create({
        data: {
          id: link.id,
          childProfileId: link.childProfileId,
          studentId: link.studentId,
          instituteId: link.instituteId,
        },
      });

      return this.mapToEntity(record);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new ConflictError('Student is already linked to this child profile');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<StudentLinkEntity | null> {
    const record = await db.studentLink.findUnique({
      where: { id },
    });

    if (!record) {
      return null;
    }

    return this.mapToEntity(record);
  }

  async findByChildProfileId(childProfileId: string): Promise<StudentLinkEntity[]> {
    const records = await db.studentLink.findMany({
      where: { childProfileId },
    });

    return records.map((record) => this.mapToEntity(record));
  }

  async findByChildProfileAndStudent(
    childProfileId: string,
    studentId: string,
  ): Promise<StudentLinkEntity | null> {
    const record = await db.studentLink.findUnique({
      where: {
        childProfileId_studentId: {
          childProfileId,
          studentId,
        },
      },
    });

    if (!record) {
      return null;
    }

    return this.mapToEntity(record);
  }

  async delete(id: string): Promise<void> {
    await db.studentLink.delete({
      where: { id },
    });
  }
}
