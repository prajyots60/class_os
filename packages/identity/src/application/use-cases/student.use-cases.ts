import { logger } from '@coaching-os/observability';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { CAPABILITIES, requireCapability } from '../../authorization';
import type {
  StudentAdmissionStatus,
  StudentGender,
  StudentStatus,
} from '../../domain/entities/student.entity';
import { StudentEntity } from '../../domain/entities/student.entity';
import type {
  ListStudentsOptions,
  StudentRepository,
} from '../../domain/repositories/student.repository';
import type { TenantContext } from './membership.use-cases';
import { toStudentDTO, type StudentDTO } from '../dto/student.dto';

// ============================================================================
// 1. CreateStudentUseCase
// ============================================================================

export interface CreateStudentCommand {
  admissionNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth?: string | Date | null;
  gender?: StudentGender | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  admissionDate?: string | Date | null;
  admissionStatus?: StudentAdmissionStatus;
  status?: StudentStatus;
}

export class CreateStudentUseCase {
  constructor(private readonly studentRepository: StudentRepository) {}

  public async execute(
    context: TenantContext,
    command: CreateStudentCommand,
  ): Promise<StudentDTO> {
    // 1. Authorization check before any read/write operations
    requireCapability(context, CAPABILITIES.STUDENT_CREATE);

    // 2. Duplicate check within trusted tenant context
    const exists = await this.studentRepository.existsByAdmissionNumber(
      context.instituteId,
      command.admissionNumber,
    );

    if (exists) {
      throw new ConflictError(
        `A student with admission number "${command.admissionNumber}" already exists in institute "${context.instituteId}".`,
      );
    }

    // 3. Instantiate Student domain aggregate
    const entity = StudentEntity.create({
      instituteId: context.instituteId,
      admissionNumber: command.admissionNumber,
      firstName: command.firstName,
      middleName: command.middleName,
      lastName: command.lastName,
      dateOfBirth: command.dateOfBirth,
      gender: command.gender,
      phone: command.phone,
      email: command.email,
      address: command.address,
      city: command.city,
      state: command.state,
      postalCode: command.postalCode,
      admissionDate: command.admissionDate,
      admissionStatus: command.admissionStatus,
      status: command.status,
    });

    // 4. Save to persistence layer
    let saved: StudentEntity;
    try {
      saved = await this.studentRepository.create(entity);
    } catch (err) {
      if (err instanceof ConflictError) {
        throw new ConflictError(
          `A student with admission number "${command.admissionNumber}" already exists in institute "${context.instituteId}".`,
        );
      }
      throw err;
    }

    // 5. Structured Pino log (Safe identifiers, PII redacted)
    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        studentId: saved.id,
        admissionNumber: saved.admissionNumber,
        operation: 'identity.student.create.success',
      },
      'identity.student.create.success',
    );

    return toStudentDTO(saved);
  }
}

// ============================================================================
// 2. GetStudentUseCase
// ============================================================================

export interface GetStudentQuery {
  id: string;
}

export class GetStudentUseCase {
  constructor(private readonly studentRepository: StudentRepository) {}

  public async execute(context: TenantContext, query: GetStudentQuery): Promise<StudentDTO> {
    requireCapability(context, CAPABILITIES.STUDENT_READ);

    const entity = await this.studentRepository.findById(context.instituteId, query.id);

    if (!entity) {
      throw new NotFoundError(`Student record with ID "${query.id}" not found.`);
    }

    return toStudentDTO(entity);
  }
}

// ============================================================================
// 3. ListStudentsUseCase
// ============================================================================

export interface ListStudentsQuery extends ListStudentsOptions {}

export class ListStudentsUseCase {
  constructor(private readonly studentRepository: StudentRepository) {}

  public async execute(
    context: TenantContext,
    query?: ListStudentsQuery,
  ): Promise<StudentDTO[]> {
    requireCapability(context, CAPABILITIES.STUDENT_READ);

    const entities = await this.studentRepository.listByInstitute(context.instituteId, query);

    return entities.map((entity) => toStudentDTO(entity));
  }
}

// ============================================================================
// 4. UpdateStudentUseCase
// ============================================================================

export interface UpdateStudentCommand {
  id: string;
  admissionNumber?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  dateOfBirth?: string | Date | null;
  gender?: StudentGender | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}

export class UpdateStudentUseCase {
  constructor(private readonly studentRepository: StudentRepository) {}

  public async execute(
    context: TenantContext,
    command: UpdateStudentCommand,
  ): Promise<StudentDTO> {
    requireCapability(context, CAPABILITIES.STUDENT_UPDATE);

    const entity = await this.studentRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Student record with ID "${command.id}" not found.`);
    }

    // Enforce admission number immutability
    if (
      command.admissionNumber !== undefined &&
      command.admissionNumber.trim() !== entity.admissionNumber
    ) {
      throw new ValidationError('Admission number is immutable and cannot be updated.');
    }

    // Update profile details
    entity.updateProfile({
      firstName: command.firstName,
      middleName: command.middleName,
      lastName: command.lastName,
      dateOfBirth: command.dateOfBirth,
      gender: command.gender,
    });

    // Update contact and address details
    entity.updateContactAndAddress({
      phone: command.phone,
      email: command.email,
      address: command.address,
      city: command.city,
      state: command.state,
      postalCode: command.postalCode,
    });

    const updated = await this.studentRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        studentId: updated.id,
        operation: 'identity.student.update.success',
      },
      'identity.student.update.success',
    );

    return toStudentDTO(updated);
  }
}

// ============================================================================
// 5. AdmitStudentUseCase
// ============================================================================

export interface AdmitStudentCommand {
  id: string;
  admissionDate?: Date | string;
}

export class AdmitStudentUseCase {
  constructor(private readonly studentRepository: StudentRepository) {}

  public async execute(
    context: TenantContext,
    command: AdmitStudentCommand,
  ): Promise<StudentDTO> {
    requireCapability(context, CAPABILITIES.STUDENT_UPDATE);

    const entity = await this.studentRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Student record with ID "${command.id}" not found.`);
    }

    entity.admit(command.admissionDate);

    const updated = await this.studentRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        studentId: updated.id,
        admissionStatus: updated.admissionStatus,
        status: updated.status,
        operation: 'identity.student.admission.admitted',
      },
      'identity.student.admission.admitted',
    );

    return toStudentDTO(updated);
  }
}

// ============================================================================
// 6. RejectStudentUseCase
// ============================================================================

export interface RejectStudentCommand {
  id: string;
}

export class RejectStudentUseCase {
  constructor(private readonly studentRepository: StudentRepository) {}

  public async execute(
    context: TenantContext,
    command: RejectStudentCommand,
  ): Promise<StudentDTO> {
    requireCapability(context, CAPABILITIES.STUDENT_UPDATE);

    const entity = await this.studentRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Student record with ID "${command.id}" not found.`);
    }

    entity.reject();

    const updated = await this.studentRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        studentId: updated.id,
        admissionStatus: updated.admissionStatus,
        status: updated.status,
        operation: 'identity.student.admission.rejected',
      },
      'identity.student.admission.rejected',
    );

    return toStudentDTO(updated);
  }
}

// ============================================================================
// 7. CancelStudentAdmissionUseCase
// ============================================================================

export interface CancelStudentAdmissionCommand {
  id: string;
}

export class CancelStudentAdmissionUseCase {
  constructor(private readonly studentRepository: StudentRepository) {}

  public async execute(
    context: TenantContext,
    command: CancelStudentAdmissionCommand,
  ): Promise<StudentDTO> {
    requireCapability(context, CAPABILITIES.STUDENT_UPDATE);

    const entity = await this.studentRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Student record with ID "${command.id}" not found.`);
    }

    entity.cancel();

    const updated = await this.studentRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        studentId: updated.id,
        admissionStatus: updated.admissionStatus,
        status: updated.status,
        operation: 'identity.student.admission.cancelled',
      },
      'identity.student.admission.cancelled',
    );

    return toStudentDTO(updated);
  }
}

// ============================================================================
// 8. ActivateStudentUseCase
// ============================================================================

export interface ActivateStudentCommand {
  id: string;
}

export class ActivateStudentUseCase {
  constructor(private readonly studentRepository: StudentRepository) {}

  public async execute(
    context: TenantContext,
    command: ActivateStudentCommand,
  ): Promise<StudentDTO> {
    requireCapability(context, CAPABILITIES.STUDENT_UPDATE);

    const entity = await this.studentRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Student record with ID "${command.id}" not found.`);
    }

    entity.activate();

    const updated = await this.studentRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        studentId: updated.id,
        status: updated.status,
        operation: 'identity.student.lifecycle.activated',
      },
      'identity.student.lifecycle.activated',
    );

    return toStudentDTO(updated);
  }
}

// ============================================================================
// 9. DeactivateStudentUseCase
// ============================================================================

export interface DeactivateStudentCommand {
  id: string;
}

export class DeactivateStudentUseCase {
  constructor(private readonly studentRepository: StudentRepository) {}

  public async execute(
    context: TenantContext,
    command: DeactivateStudentCommand,
  ): Promise<StudentDTO> {
    requireCapability(context, CAPABILITIES.STUDENT_UPDATE);

    const entity = await this.studentRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Student record with ID "${command.id}" not found.`);
    }

    entity.deactivate();

    const updated = await this.studentRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        studentId: updated.id,
        status: updated.status,
        operation: 'identity.student.lifecycle.deactivated',
      },
      'identity.student.lifecycle.deactivated',
    );

    return toStudentDTO(updated);
  }
}

// ============================================================================
// 10. ArchiveStudentUseCase
// ============================================================================

export interface ArchiveStudentCommand {
  id: string;
}

export class ArchiveStudentUseCase {
  constructor(private readonly studentRepository: StudentRepository) {}

  public async execute(
    context: TenantContext,
    command: ArchiveStudentCommand,
  ): Promise<StudentDTO> {
    requireCapability(context, CAPABILITIES.STUDENT_ARCHIVE);

    const entity = await this.studentRepository.findById(context.instituteId, command.id);

    if (!entity) {
      throw new NotFoundError(`Student record with ID "${command.id}" not found.`);
    }

    entity.archive();

    const updated = await this.studentRepository.update(entity);

    logger.info(
      {
        actorUserId: context.userId,
        instituteId: context.instituteId,
        studentId: updated.id,
        status: updated.status,
        deletedAt: updated.deletedAt,
        operation: 'identity.student.lifecycle.archived',
      },
      'identity.student.lifecycle.archived',
    );

    return toStudentDTO(updated);
  }
}
