import { db, Prisma } from '@coaching-os/database';
import { NotFoundError, ValidationError } from '@coaching-os/shared';
import { MarksEntity, type MarksProps } from '../../domain/entities/marks.entity';
import { MarksRepository } from '../../domain/repositories/marks.repository';

export class PrismaMarksRepository implements MarksRepository {
  private mapToDomain(model: {
    id: string;
    instituteId: string;
    testId: string;
    enrollmentId: string;
    marksObtained: Prisma.Decimal | number;
    createdAt: Date;
    updatedAt: Date;
  }): MarksEntity {
    const props: MarksProps = {
      id: model.id,
      instituteId: model.instituteId,
      testId: model.testId,
      enrollmentId: model.enrollmentId,
      marksObtained: typeof model.marksObtained === 'number' ? model.marksObtained : Number(model.marksObtained),
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
    return MarksEntity.from(props);
  }

  public async findByTestId(instituteId: string, testId: string): Promise<MarksEntity[]> {
    const models = await db.marks.findMany({
      where: {
        instituteId,
        testId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return models.map((m) => this.mapToDomain(m));
  }

  public async findByTestAndEnrollment(
    instituteId: string,
    testId: string,
    enrollmentId: string,
  ): Promise<MarksEntity | null> {
    const model = await db.marks.findFirst({
      where: {
        instituteId,
        testId,
        enrollmentId,
      },
    });

    if (!model) return null;
    return this.mapToDomain(model);
  }

  public async upsertMany(
    instituteId: string,
    testId: string,
    marks: MarksEntity[],
  ): Promise<MarksEntity[]> {
    if (marks.length === 0) {
      return [];
    }

    // Verify test exists in tenant
    const test = await db.test.findFirst({
      where: {
        id: testId,
        instituteId,
      },
    });

    if (!test) {
      throw new NotFoundError(`Test with ID "${testId}" not found in institute "${instituteId}".`);
    }

    if (test.status === 'published') {
      throw new ValidationError('Cannot enter or update marks for a published test. Published results are immutable.');
    }

    // Execute atomic transaction for bulk upsert + test status update
    return await db.$transaction(async (tx) => {
      const results: MarksEntity[] = [];

      for (const item of marks) {
        const model = await tx.marks.upsert({
          where: {
            testId_enrollmentId: {
              testId: item.testId,
              enrollmentId: item.enrollmentId,
            },
          },
          create: {
            id: item.id,
            instituteId: item.instituteId,
            testId: item.testId,
            enrollmentId: item.enrollmentId,
            marksObtained: new Prisma.Decimal(item.marksObtained),
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          },
          update: {
            marksObtained: new Prisma.Decimal(item.marksObtained),
            updatedAt: item.updatedAt,
          },
        });

        results.push(this.mapToDomain(model));
      }

      // Transition test status to marks_entered if currently draft or scheduled
      if (test.status === 'draft' || test.status === 'scheduled') {
        await tx.test.update({
          where: {
            id: testId,
          },
          data: {
            status: 'marks_entered',
            updatedAt: new Date(),
          },
        });
      }

      return results;
    });
  }
}
