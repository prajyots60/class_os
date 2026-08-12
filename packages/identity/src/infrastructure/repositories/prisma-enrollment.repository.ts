import { db } from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import {
  EnrollmentEntity,
  type EnrollmentStatus,
} from '../../domain/entities/enrollment.entity';
import type {
  EnrollmentRepository,
  ListEnrollmentsOptions,
} from '../../domain/repositories/enrollment.repository';

/**
 * PrismaEnrollmentRepository
 *
 * PostgreSQL Prisma implementation of EnrollmentRepository.
 *
 * ARCHITECTURAL CONTRACT (ADR-0014):
 * - Operates strictly on tenant-scoped Enrollment domain entities.
 * - EVERY method enforces `instituteId` tenant scoping at the database query boundary.
 * - Enforces composite uniqueness: UNIQUE(institute_id, student_id, batch_id).
 * - Maps PostgreSQL/Prisma errors into clean domain errors (P2002 -> ConflictError, P2025 -> NotFoundError).
 * - Cross-tenant queries return null or empty lists, preventing cross-tenant existence disclosure.
 */
export class PrismaEnrollmentRepository implements EnrollmentRepository {
  /**
   * Create a new Enrollment record in PostgreSQL.
   */
  public async create(entity: EnrollmentEntity): Promise<EnrollmentEntity> {
    // Validate target student belongs strictly to tenant institute
    const student = await db.student.findFirst({
      where: { id: entity.studentId, instituteId: entity.instituteId },
    });
    if (!student) {
      throw new ValidationError(
        `Target student "${entity.studentId}" does not exist in institute "${entity.instituteId}".`,
      );
    }

    // Validate target batch belongs strictly to tenant institute
    const batch = await db.batch.findFirst({
      where: { id: entity.batchId, instituteId: entity.instituteId },
    });
    if (!batch) {
      throw new ValidationError(
        `Target batch "${entity.batchId}" does not exist in institute "${entity.instituteId}".`,
      );
    }

    try {
      const record = await db.enrollment.create({
        data: {
          id: entity.id,
          instituteId: entity.instituteId,
          studentId: entity.studentId,
          batchId: entity.batchId,
          status: entity.status as EnrollmentStatus,
          enrolledAt: entity.enrolledAt,
          completedAt: entity.completedAt,
          withdrawnAt: entity.withdrawnAt,
          transferredAt: entity.transferredAt,
          transferredToBatchId: entity.transferredToBatchId,
          transferredToEnrollmentId: entity.transferredToEnrollmentId,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
          deletedAt: entity.deletedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `Student "${entity.studentId}" is already enrolled in batch "${entity.batchId}" in institute "${entity.instituteId}".`,
        );
      }
      if (error?.code === 'P2003') {
        throw new ValidationError(
          `Foreign key constraint failure: Target student, batch, or institute does not exist.`,
        );
      }
      throw error;
    }
  }

  /**
   * Look up an Enrollment record by ID strictly within tenant context.
   */
  public async findById(instituteId: string, id: string): Promise<EnrollmentEntity | null> {
    if (!instituteId || !id) {
      return null;
    }

    const record = await db.enrollment.findFirst({
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
   * Find enrollments for a specific student strictly within tenant context.
   */
  public async findByStudent(
    instituteId: string,
    studentId: string,
    options?: ListEnrollmentsOptions,
  ): Promise<EnrollmentEntity[]> {
    if (!instituteId || !studentId) {
      return [];
    }

    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, Math.min(100, options?.limit ?? 50));
    const skip = (page - 1) * limit;

    const records = await db.enrollment.findMany({
      where: {
        instituteId,
        studentId,
        ...(options?.status ? { status: options.status as EnrollmentStatus } : {}),
        ...(options?.batchId ? { batchId: options.batchId } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  /**
   * Find enrollments for a specific batch strictly within tenant context.
   */
  public async findByBatch(
    instituteId: string,
    batchId: string,
    options?: ListEnrollmentsOptions,
  ): Promise<EnrollmentEntity[]> {
    if (!instituteId || !batchId) {
      return [];
    }

    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, Math.min(100, options?.limit ?? 50));
    const skip = (page - 1) * limit;

    const records = await db.enrollment.findMany({
      where: {
        instituteId,
        batchId,
        ...(options?.status ? { status: options.status as EnrollmentStatus } : {}),
        ...(options?.studentId ? { studentId: options.studentId } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  /**
   * Find active enrollments for a student strictly within tenant context.
   */
  public async findActiveByStudent(
    instituteId: string,
    studentId: string,
  ): Promise<EnrollmentEntity[]> {
    if (!instituteId || !studentId) {
      return [];
    }

    const records = await db.enrollment.findMany({
      where: {
        instituteId,
        studentId,
        status: 'active',
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  /**
   * Find active enrollments for a batch strictly within tenant context.
   */
  public async findActiveByBatch(
    instituteId: string,
    batchId: string,
  ): Promise<EnrollmentEntity[]> {
    if (!instituteId || !batchId) {
      return [];
    }

    const records = await db.enrollment.findMany({
      where: {
        instituteId,
        batchId,
        status: 'active',
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  /**
   * Look up an enrollment record for a (studentId, batchId) pair strictly within tenant context.
   */
  public async findByStudentAndBatch(
    instituteId: string,
    studentId: string,
    batchId: string,
  ): Promise<EnrollmentEntity | null> {
    if (!instituteId || !studentId || !batchId) {
      return null;
    }

    const record = await db.enrollment.findFirst({
      where: {
        instituteId,
        studentId,
        batchId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!record) {
      return null;
    }

    return this.toDomainEntity(record);
  }

  /**
   * Check whether an active or pending enrollment exists for a (studentId, batchId) pair.
   */
  public async existsActiveOrPending(
    instituteId: string,
    studentId: string,
    batchId: string,
  ): Promise<boolean> {
    if (!instituteId || !studentId || !batchId) {
      return false;
    }

    const count = await db.enrollment.count({
      where: {
        instituteId,
        studentId,
        batchId,
        status: {
          in: ['active', 'pending'],
        },
        deletedAt: null,
      },
    });

    return count > 0;
  }

  /**
   * Count active and pending enrollments for a batch to enforce capacity limits.
   */
  public async countActiveOrPendingByBatch(
    instituteId: string,
    batchId: string,
  ): Promise<number> {
    if (!instituteId || !batchId) {
      return 0;
    }

    return db.enrollment.count({
      where: {
        instituteId,
        batchId,
        status: {
          in: ['active', 'pending'],
        },
        deletedAt: null,
      },
    });
  }

  /**
   * List Enrollment records for an institute with optional filters and pagination.
   */
  public async listByInstitute(
    instituteId: string,
    options?: ListEnrollmentsOptions,
  ): Promise<EnrollmentEntity[]> {
    if (!instituteId) {
      return [];
    }

    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, Math.min(100, options?.limit ?? 50));
    const skip = (page - 1) * limit;

    const records = await db.enrollment.findMany({
      where: {
        instituteId,
        ...(options?.status ? { status: options.status as EnrollmentStatus } : {}),
        ...(options?.studentId ? { studentId: options.studentId } : {}),
        ...(options?.batchId ? { batchId: options.batchId } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  /**
   * Update an existing Enrollment record strictly within tenant context.
   */
  public async update(entity: EnrollmentEntity): Promise<EnrollmentEntity> {
    const existing = await this.findById(entity.instituteId, entity.id);
    if (!existing) {
      throw new NotFoundError(
        `Enrollment record "${entity.id}" not found in institute "${entity.instituteId}".`,
      );
    }

    try {
      const record = await db.enrollment.update({
        where: { id: entity.id },
        data: {
          status: entity.status as EnrollmentStatus,
          enrolledAt: entity.enrolledAt,
          completedAt: entity.completedAt,
          withdrawnAt: entity.withdrawnAt,
          transferredAt: entity.transferredAt,
          transferredToBatchId: entity.transferredToBatchId,
          transferredToEnrollmentId: entity.transferredToEnrollmentId,
          updatedAt: entity.updatedAt,
          deletedAt: entity.deletedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError(
          `Enrollment record "${entity.id}" not found in institute "${entity.instituteId}".`,
        );
      }
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `Student "${entity.studentId}" is already enrolled in batch "${entity.batchId}" in institute "${entity.instituteId}".`,
        );
      }
      throw error;
    }
  }

  /**
   * Persists a new Enrollment domain entity with pessimistic row-level locking on target Batch capacity.
   */
  public async createWithCapacityCheck(entity: EnrollmentEntity): Promise<EnrollmentEntity> {
    return db.$transaction(async (tx) => {
      const rawBatches = await tx.$queryRaw<Array<{ id: string; instituteId: string; capacity: number | null; status: string }>>`
        SELECT id, institute_id as "instituteId", capacity, status
        FROM batches
        WHERE id = ${entity.batchId}::uuid AND institute_id = ${entity.instituteId}::uuid
        FOR UPDATE
      `;

      if (rawBatches.length === 0) {
        throw new NotFoundError(
          `Target batch "${entity.batchId}" not found in institute "${entity.instituteId}".`,
        );
      }

      const batch = rawBatches[0];
      if (batch.status !== 'open' && batch.status !== 'running') {
        throw new ValidationError(
          `Target batch "${entity.batchId}" is in status "${batch.status}" and cannot accept enrollments.`,
        );
      }

      const rawStudents = await tx.$queryRaw<Array<{ id: string; admissionStatus: string; status: string }>>`
        SELECT id, admission_status as "admissionStatus", status
        FROM students
        WHERE id = ${entity.studentId}::uuid AND institute_id = ${entity.instituteId}::uuid
      `;

      if (rawStudents.length === 0) {
        throw new NotFoundError(
          `Target student "${entity.studentId}" not found in institute "${entity.instituteId}".`,
        );
      }

      const student = rawStudents[0];
      if (student.admissionStatus !== 'admitted') {
        throw new ValidationError(
          `Student "${entity.studentId}" has admission status "${student.admissionStatus}" and cannot be enrolled.`,
        );
      }

      if (student.status !== 'active') {
        throw new ValidationError(
          `Student "${entity.studentId}" is in status "${student.status}" and cannot be enrolled.`,
        );
      }

      const activeCount = await tx.enrollment.count({
        where: {
          instituteId: entity.instituteId,
          studentId: entity.studentId,
          batchId: entity.batchId,
          status: { in: ['pending', 'active'] },
          deletedAt: null,
        },
      });

      if (activeCount > 0) {
        throw new ConflictError(
          `Student "${entity.studentId}" is already actively enrolled in batch "${entity.batchId}".`,
        );
      }

      if (batch.capacity !== null) {
        const currentCapacityCount = await tx.enrollment.count({
          where: {
            instituteId: entity.instituteId,
            batchId: entity.batchId,
            status: { in: ['pending', 'active'] },
            deletedAt: null,
          },
        });

        if (currentCapacityCount >= batch.capacity) {
          throw new ConflictError(
            `Target batch "${entity.batchId}" has reached its maximum capacity of ${batch.capacity}.`,
          );
        }
      }

      try {
        const record = await tx.enrollment.create({
          data: {
            id: entity.id,
            instituteId: entity.instituteId,
            studentId: entity.studentId,
            batchId: entity.batchId,
            status: entity.status as EnrollmentStatus,
            enrolledAt: entity.enrolledAt,
            completedAt: entity.completedAt,
            withdrawnAt: entity.withdrawnAt,
            transferredAt: entity.transferredAt,
            transferredToBatchId: entity.transferredToBatchId,
            transferredToEnrollmentId: entity.transferredToEnrollmentId,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
            deletedAt: entity.deletedAt,
          },
        });

        return this.toDomainEntity(record);
      } catch (error: any) {
        if (error?.code === 'P2002') {
          throw new ConflictError(
            `Student "${entity.studentId}" is already enrolled in batch "${entity.batchId}" in institute "${entity.instituteId}".`,
          );
        }
        throw error;
      }
    });
  }

  /**
   * Atomically transfers a student from source enrollment to a target batch.
   */
  public async transferWithCapacityCheck(params: {
    sourceEnrollment: EnrollmentEntity;
    targetBatchId: string;
    destinationEnrollment: EnrollmentEntity;
  }): Promise<{ source: EnrollmentEntity; destination: EnrollmentEntity }> {
    const { sourceEnrollment, targetBatchId, destinationEnrollment } = params;

    return db.$transaction(async (tx) => {
      // 1. Lock Source Enrollment
      const rawSourceEnrollments = await tx.$queryRaw<Array<{ id: string; status: string }>>`
        SELECT id, status
        FROM enrollments
        WHERE id = ${sourceEnrollment.id}::uuid AND institute_id = ${sourceEnrollment.instituteId}::uuid
        FOR UPDATE
      `;

      if (rawSourceEnrollments.length === 0) {
        throw new NotFoundError(
          `Source enrollment "${sourceEnrollment.id}" not found in institute "${sourceEnrollment.instituteId}".`,
        );
      }

      const dbSourceEnrollment = rawSourceEnrollments[0];
      if (dbSourceEnrollment.status !== 'active') {
        throw new ValidationError(
          `Source enrollment "${sourceEnrollment.id}" is in status "${dbSourceEnrollment.status}" and cannot be transferred.`,
        );
      }

      // 2. Lock Target Batch
      const rawTargetBatches = await tx.$queryRaw<Array<{ id: string; capacity: number | null; status: string }>>`
        SELECT id, capacity, status
        FROM batches
        WHERE id = ${targetBatchId}::uuid AND institute_id = ${sourceEnrollment.instituteId}::uuid
        FOR UPDATE
      `;

      if (rawTargetBatches.length === 0) {
        throw new NotFoundError(
          `Destination batch "${targetBatchId}" not found in institute "${sourceEnrollment.instituteId}".`,
        );
      }

      const targetBatch = rawTargetBatches[0];
      if (targetBatch.status !== 'open' && targetBatch.status !== 'running') {
        throw new ValidationError(
          `Destination batch "${targetBatchId}" is in status "${targetBatch.status}" and cannot accept transfer enrollments.`,
        );
      }

      const rawStudents = await tx.$queryRaw<Array<{ id: string; admissionStatus: string; status: string }>>`
        SELECT id, admission_status as "admissionStatus", status
        FROM students
        WHERE id = ${sourceEnrollment.studentId}::uuid AND institute_id = ${sourceEnrollment.instituteId}::uuid
      `;

      if (rawStudents.length === 0) {
        throw new NotFoundError(
          `Student "${sourceEnrollment.studentId}" not found in institute "${sourceEnrollment.instituteId}".`,
        );
      }

      const student = rawStudents[0];
      if (student.admissionStatus !== 'admitted' || student.status !== 'active') {
        throw new ValidationError(
          `Student "${sourceEnrollment.studentId}" is not eligible for transfer (admissionStatus=${student.admissionStatus}, status=${student.status}).`,
        );
      }

      if (targetBatch.capacity !== null) {
        const targetActiveCount = await tx.enrollment.count({
          where: {
            instituteId: sourceEnrollment.instituteId,
            batchId: targetBatchId,
            status: { in: ['pending', 'active'] },
            deletedAt: null,
          },
        });

        if (targetActiveCount >= targetBatch.capacity) {
          throw new ConflictError(
            `Destination batch "${targetBatchId}" has reached its maximum capacity of ${targetBatch.capacity}.`,
          );
        }
      }

      const destinationExisting = await tx.enrollment.count({
        where: {
          instituteId: sourceEnrollment.instituteId,
          studentId: sourceEnrollment.studentId,
          batchId: targetBatchId,
          status: { in: ['pending', 'active'] },
          deletedAt: null,
        },
      });

      if (destinationExisting > 0) {
        throw new ConflictError(
          `Student "${sourceEnrollment.studentId}" is already actively enrolled in target batch "${targetBatchId}".`,
        );
      }

      const destinationRecord = await tx.enrollment.create({
        data: {
          id: destinationEnrollment.id,
          instituteId: destinationEnrollment.instituteId,
          studentId: destinationEnrollment.studentId,
          batchId: destinationEnrollment.batchId,
          status: destinationEnrollment.status as EnrollmentStatus,
          enrolledAt: destinationEnrollment.enrolledAt,
          createdAt: destinationEnrollment.createdAt,
          updatedAt: destinationEnrollment.updatedAt,
        },
      });

      const sourceRecord = await tx.enrollment.update({
        where: { id: sourceEnrollment.id },
        data: {
          status: sourceEnrollment.status as EnrollmentStatus,
          transferredAt: sourceEnrollment.transferredAt,
          transferredToBatchId: sourceEnrollment.transferredToBatchId,
          transferredToEnrollmentId: sourceEnrollment.transferredToEnrollmentId,
          updatedAt: sourceEnrollment.updatedAt,
        },
      });

      return {
        source: this.toDomainEntity(sourceRecord),
        destination: this.toDomainEntity(destinationRecord),
      };
    });
  }

  // ── Mapping Helper ─────────────────────────────────────────────────────────

  private toDomainEntity(record: {
    id: string;
    instituteId: string;
    studentId: string;
    batchId: string;
    status: string;
    enrolledAt: Date;
    completedAt: Date | null;
    withdrawnAt: Date | null;
    transferredAt: Date | null;
    transferredToBatchId: string | null;
    transferredToEnrollmentId: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): EnrollmentEntity {
    return EnrollmentEntity.from({
      id: record.id,
      instituteId: record.instituteId,
      studentId: record.studentId,
      batchId: record.batchId,
      status: record.status as EnrollmentStatus,
      enrolledAt: record.enrolledAt,
      completedAt: record.completedAt,
      withdrawnAt: record.withdrawnAt,
      transferredAt: record.transferredAt,
      transferredToBatchId: record.transferredToBatchId,
      transferredToEnrollmentId: record.transferredToEnrollmentId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
