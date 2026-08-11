import { db } from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import {
  StudentEntity,
  type StudentAdmissionStatus,
  type StudentGender,
  type StudentStatus,
} from '../../domain/entities/student.entity';
import type {
  ListStudentsOptions,
  StudentRepository,
} from '../../domain/repositories/student.repository';

/**
 * PrismaStudentRepository
 *
 * PostgreSQL Prisma implementation of StudentRepository.
 *
 * ARCHITECTURAL CONTRACT:
 * - Operates strictly on tenant-scoped Student entities.
 * - EVERY method enforces `instituteId` tenant scoping at the database query boundary.
 * - Enforces composite uniqueness: UNIQUE(institute_id, admission_number).
 * - Maps PostgreSQL/Prisma errors into clean domain/infrastructure errors (P2002 -> ConflictError).
 * - Cross-tenant queries return null or empty lists, preventing cross-tenant existence disclosure.
 */
export class PrismaStudentRepository implements StudentRepository {
  /**
   * Create a new Student record in PostgreSQL.
   */
  public async create(entity: StudentEntity): Promise<StudentEntity> {
    try {
      const record = await db.student.create({
        data: {
          id: entity.id,
          instituteId: entity.instituteId,
          admissionNumber: entity.admissionNumber,
          firstName: entity.firstName,
          middleName: entity.middleName,
          lastName: entity.lastName,
          dateOfBirth: entity.dateOfBirth ? entity.dateOfBirth.toDate() : null,
          gender: entity.gender as StudentGender | null,
          phone: entity.phone ? entity.phone.value : null,
          email: entity.email,
          address: entity.address,
          city: entity.city,
          state: entity.state,
          postalCode: entity.postalCode,
          admissionDate: entity.admissionDate,
          admissionStatus: entity.admissionStatus as StudentAdmissionStatus,
          status: entity.status as StudentStatus,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
          deletedAt: entity.deletedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `A student with admission number "${entity.admissionNumber}" already exists in institute "${entity.instituteId}".`,
        );
      }
      if (error?.code === 'P2003') {
        throw new ValidationError(
          `Foreign key constraint failure: Target institute "${entity.instituteId}" does not exist.`,
        );
      }
      throw error;
    }
  }

  /**
   * Look up a Student record by ID strictly within tenant context.
   */
  public async findById(instituteId: string, id: string): Promise<StudentEntity | null> {
    if (!instituteId || !id) {
      return null;
    }

    const record = await db.student.findFirst({
      where: {
        id,
        instituteId,
      },
    });

    if (!record) {
      return null;
    }

    return this.toDomainEntity(record);
  }

  /**
   * Look up a Student record by admission number strictly within tenant context.
   */
  public async findByAdmissionNumber(
    instituteId: string,
    admissionNumber: string,
  ): Promise<StudentEntity | null> {
    if (!instituteId || !admissionNumber) {
      return null;
    }

    const record = await db.student.findUnique({
      where: {
        student_admission_number_unique: {
          instituteId,
          admissionNumber: admissionNumber.trim(),
        },
      },
    });

    if (!record) {
      return null;
    }

    return this.toDomainEntity(record);
  }

  /**
   * List Student records for an institute with optional filters and pagination.
   */
  public async listByInstitute(
    instituteId: string,
    options?: ListStudentsOptions,
  ): Promise<StudentEntity[]> {
    if (!instituteId) {
      return [];
    }

    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, Math.min(100, options?.limit ?? 50));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      instituteId,
      ...(options?.status ? { status: options.status } : {}),
      ...(options?.admissionStatus ? { admissionStatus: options.admissionStatus } : {}),
    };

    if (options?.search && options.search.trim() !== '') {
      const searchTerm = options.search.trim();
      whereClause.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { admissionNumber: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const records = await db.student.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  /**
   * Update an existing Student record strictly within tenant context.
   */
  public async update(entity: StudentEntity): Promise<StudentEntity> {
    // Verify target record exists within the specified tenant context
    const existing = await this.findById(entity.instituteId, entity.id);
    if (!existing) {
      throw new NotFoundError(
        `Student record "${entity.id}" not found in institute "${entity.instituteId}".`,
      );
    }

    try {
      const record = await db.student.update({
        where: { id: entity.id },
        data: {
          firstName: entity.firstName,
          middleName: entity.middleName,
          lastName: entity.lastName,
          dateOfBirth: entity.dateOfBirth ? entity.dateOfBirth.toDate() : null,
          gender: entity.gender as StudentGender | null,
          phone: entity.phone ? entity.phone.value : null,
          email: entity.email,
          address: entity.address,
          city: entity.city,
          state: entity.state,
          postalCode: entity.postalCode,
          admissionDate: entity.admissionDate,
          admissionStatus: entity.admissionStatus as StudentAdmissionStatus,
          status: entity.status as StudentStatus,
          updatedAt: entity.updatedAt,
          deletedAt: entity.deletedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError(
          `Student record "${entity.id}" not found in institute "${entity.instituteId}".`,
        );
      }
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `A student with admission number "${entity.admissionNumber}" already exists in institute "${entity.instituteId}".`,
        );
      }
      throw error;
    }
  }

  /**
   * Check whether a Student record exists for a (instituteId, admissionNumber) pair.
   */
  public async existsByAdmissionNumber(instituteId: string, admissionNumber: string): Promise<boolean> {
    if (!instituteId || !admissionNumber) {
      return false;
    }

    const count = await db.student.count({
      where: {
        instituteId,
        admissionNumber: admissionNumber.trim(),
      },
    });

    return count > 0;
  }

  // ── Mapping Helper ─────────────────────────────────────────────────────────

  private toDomainEntity(record: {
    id: string;
    instituteId: string;
    admissionNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    dateOfBirth: Date | null;
    gender: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    admissionDate: Date | null;
    admissionStatus: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): StudentEntity {
    return StudentEntity.from({
      id: record.id,
      instituteId: record.instituteId,
      admissionNumber: record.admissionNumber,
      firstName: record.firstName,
      middleName: record.middleName,
      lastName: record.lastName,
      dateOfBirth: record.dateOfBirth,
      gender: record.gender as StudentGender | null,
      phone: record.phone,
      email: record.email,
      address: record.address,
      city: record.city,
      state: record.state,
      postalCode: record.postalCode,
      admissionDate: record.admissionDate,
      admissionStatus: record.admissionStatus as StudentAdmissionStatus,
      status: record.status as StudentStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
