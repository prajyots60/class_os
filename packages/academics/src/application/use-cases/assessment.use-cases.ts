import { NotFoundError, ValidationError } from '@coaching-os/shared';
import { CAPABILITIES, requireCapability, type TenantContext } from '@coaching-os/identity';
import type { BatchRepository, EnrollmentRepository } from '@coaching-os/identity';
import { TestEntity, type TestDTO } from '../../domain/entities/test.entity';
import { MarksEntity, type MarksDTO } from '../../domain/entities/marks.entity';
import type { TestRepository } from '../../domain/repositories/test.repository';
import type { MarksRepository } from '../../domain/repositories/marks.repository';
import {
  createTestSchema,
  updateTestSchema,
  enterTestMarksSchema,
  listTestsForBatchSchema,
  type CreateTestInput,
  type UpdateTestInput,
  type EnterTestMarksInput,
} from '../../presentation/validators/assessment.validator';

// ============================================================================
// 1. CreateTestUseCase
// ============================================================================

export class CreateTestUseCase {
  constructor(
    private readonly testRepository: TestRepository,
    private readonly batchRepository: BatchRepository,
  ) {}

  public async execute(context: TenantContext, command: CreateTestInput): Promise<TestDTO> {
    requireCapability(context, CAPABILITIES.ACADEMIC_WRITE);

    const validated = createTestSchema.parse(command);

    // Verify batch belongs to tenant
    const batch = await this.batchRepository.findById(context.instituteId, validated.batchId);
    if (!batch || batch.instituteId !== context.instituteId) {
      throw new NotFoundError(
        `Target batch "${validated.batchId}" not found in institute "${context.instituteId}".`,
      );
    }

    const test = TestEntity.create({
      instituteId: context.instituteId, // Derived strictly from server context
      batchId: validated.batchId,
      title: validated.title,
      maximumMarks: validated.maximumMarks,
      scheduledDate: validated.scheduledDate,
    });

    const saved = await this.testRepository.create(test);
    return saved.toDTO();
  }
}

// ============================================================================
// 2. GetTestUseCase
// ============================================================================

export class GetTestUseCase {
  constructor(private readonly testRepository: TestRepository) {}

  public async execute(context: TenantContext, testId: string): Promise<TestDTO> {
    requireCapability(context, CAPABILITIES.ACADEMIC_READ);

    if (!testId || testId.trim() === '') {
      throw new ValidationError('Test ID cannot be empty.');
    }

    const test = await this.testRepository.findById(context.instituteId, testId);
    if (!test) {
      throw new NotFoundError(
        `Test with ID "${testId}" not found in institute "${context.instituteId}".`,
      );
    }

    return test.toDTO();
  }
}

// ============================================================================
// 3. ListTestsForBatchUseCase
// ============================================================================

export class ListTestsForBatchUseCase {
  constructor(
    private readonly testRepository: TestRepository,
    private readonly batchRepository: BatchRepository,
  ) {}

  public async execute(context: TenantContext, batchId: string): Promise<TestDTO[]> {
    requireCapability(context, CAPABILITIES.ACADEMIC_READ);

    listTestsForBatchSchema.parse({ batchId });

    // Verify batch belongs to tenant
    const batch = await this.batchRepository.findById(context.instituteId, batchId);
    if (!batch || batch.instituteId !== context.instituteId) {
      throw new NotFoundError(
        `Batch with ID "${batchId}" not found in institute "${context.instituteId}".`,
      );
    }

    const records = await this.testRepository.listByBatch(context.instituteId, batchId);
    return records.map((r) => r.toDTO());
  }
}

// ============================================================================
// 4. UpdateTestUseCase
// ============================================================================

export class UpdateTestUseCase {
  constructor(private readonly testRepository: TestRepository) {}

  public async execute(
    context: TenantContext,
    testId: string,
    command: UpdateTestInput,
  ): Promise<TestDTO> {
    requireCapability(context, CAPABILITIES.ACADEMIC_WRITE);

    if (!testId || testId.trim() === '') {
      throw new ValidationError('Test ID cannot be empty.');
    }

    const validated = updateTestSchema.parse(command);

    const test = await this.testRepository.findById(context.instituteId, testId);
    if (!test) {
      throw new NotFoundError(
        `Test with ID "${testId}" not found in institute "${context.instituteId}".`,
      );
    }

    test.updateDetails(validated);

    const updated = await this.testRepository.update(test);
    return updated.toDTO();
  }
}

// ============================================================================
// 5. ScheduleTestUseCase
// ============================================================================

export class ScheduleTestUseCase {
  constructor(private readonly testRepository: TestRepository) {}

  public async execute(
    context: TenantContext,
    testId: string,
    scheduledDate: Date | string,
  ): Promise<TestDTO> {
    requireCapability(context, CAPABILITIES.ACADEMIC_WRITE);

    if (!testId || testId.trim() === '') {
      throw new ValidationError('Test ID cannot be empty.');
    }

    const test = await this.testRepository.findById(context.instituteId, testId);
    if (!test) {
      throw new NotFoundError(
        `Test with ID "${testId}" not found in institute "${context.instituteId}".`,
      );
    }

    test.schedule(scheduledDate);

    const scheduled = await this.testRepository.update(test);
    return scheduled.toDTO();
  }
}

// ============================================================================
// 6. EnterTestMarksUseCase (Bulk Marks Entry with Atomicity & Invariant Validation)
// ============================================================================

export class EnterTestMarksUseCase {
  constructor(
    private readonly testRepository: TestRepository,
    private readonly marksRepository: MarksRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
  ) {}

  public async execute(context: TenantContext, command: EnterTestMarksInput): Promise<MarksDTO[]> {
    requireCapability(context, CAPABILITIES.ACADEMIC_WRITE);

    const validated = enterTestMarksSchema.parse(command);

    // 1. Load test under tenant context
    const test = await this.testRepository.findById(context.instituteId, validated.testId);
    if (!test) {
      throw new NotFoundError(
        `Test with ID "${validated.testId}" not found in institute "${context.instituteId}".`,
      );
    }

    // 2. Publication immutability check
    if (test.isPublished) {
      throw new ValidationError(
        'Cannot enter or update marks for a published test. Published results are immutable.',
      );
    }

    // 3. Pre-validate ALL enrollments before any database write (ATTENDANCE-003 / ACADEMIC-005 style)
    const marksEntities: MarksEntity[] = [];

    for (const item of validated.records) {
      const enrollment = await this.enrollmentRepository.findById(
        context.instituteId,
        item.enrollmentId,
      );

      if (!enrollment || enrollment.instituteId !== context.instituteId) {
        throw new NotFoundError(
          `Enrollment record with ID "${item.enrollmentId}" not found in institute "${context.instituteId}".`,
        );
      }

      // ACADEMIC-005: Same Batch Invariant
      if (enrollment.batchId !== test.batchId) {
        throw new ValidationError(
          `Enrollment "${item.enrollmentId}" belongs to batch "${enrollment.batchId}", but test belongs to batch "${test.batchId}" (ACADEMIC-005).`,
        );
      }

      // ACADEMIC-008: Active Enrollment Requirement
      if (enrollment.status !== 'active') {
        throw new ValidationError(
          `Enrollment "${item.enrollmentId}" is not active (status: ${enrollment.status}) (ACADEMIC-008).`,
        );
      }

      // ACADEMIC-010: Marks bounds validation (0 <= marksObtained <= test.maximumMarks)
      const markEntity = MarksEntity.create({
        instituteId: context.instituteId,
        testId: test.id,
        enrollmentId: item.enrollmentId,
        marksObtained: item.marksObtained,
        maximumMarks: test.maximumMarks,
      });

      marksEntities.push(markEntity);
    }

    // 4. Persist all marks atomically in a single transaction & transition test status to marks_entered
    const saved = await this.marksRepository.upsertMany(
      context.instituteId,
      test.id,
      marksEntities,
    );

    return saved.map((m) => m.toDTO());
  }
}

// ============================================================================
// 7. GetTestMarksUseCase
// ============================================================================

export class GetTestMarksUseCase {
  constructor(
    private readonly testRepository: TestRepository,
    private readonly marksRepository: MarksRepository,
  ) {}

  public async execute(context: TenantContext, testId: string): Promise<MarksDTO[]> {
    requireCapability(context, CAPABILITIES.ACADEMIC_READ);

    if (!testId || testId.trim() === '') {
      throw new ValidationError('Test ID cannot be empty.');
    }

    const test = await this.testRepository.findById(context.instituteId, testId);
    if (!test) {
      throw new NotFoundError(
        `Test with ID "${testId}" not found in institute "${context.instituteId}".`,
      );
    }

    const marks = await this.marksRepository.findByTestId(context.instituteId, testId);
    return marks.map((m) => m.toDTO());
  }
}

// ============================================================================
// 8. PublishTestResultsUseCase (Explicit Publication Command)
// ============================================================================

export class PublishTestResultsUseCase {
  constructor(private readonly testRepository: TestRepository) {}

  public async execute(context: TenantContext, testId: string): Promise<TestDTO> {
    requireCapability(context, CAPABILITIES.ACADEMIC_WRITE);

    if (!testId || testId.trim() === '') {
      throw new ValidationError('Test ID cannot be empty.');
    }

    const test = await this.testRepository.findById(context.instituteId, testId);
    if (!test) {
      throw new NotFoundError(
        `Test with ID "${testId}" not found in institute "${context.instituteId}".`,
      );
    }

    test.publishResults();

    const published = await this.testRepository.update(test);
    return published.toDTO();
  }
}

// ============================================================================
// 9. DeleteTestUseCase
// ============================================================================

export class DeleteTestUseCase {
  constructor(private readonly testRepository: TestRepository) {}

  public async execute(context: TenantContext, testId: string): Promise<boolean> {
    requireCapability(context, CAPABILITIES.ACADEMIC_WRITE);

    if (!testId || testId.trim() === '') {
      throw new ValidationError('Test ID cannot be empty.');
    }

    const test = await this.testRepository.findById(context.instituteId, testId);
    if (!test) {
      throw new NotFoundError(
        `Test with ID "${testId}" not found in institute "${context.instituteId}".`,
      );
    }

    if (test.isPublished) {
      throw new ValidationError('Cannot delete a published test. Published results are immutable.');
    }

    return this.testRepository.delete(context.instituteId, testId);
  }
}
