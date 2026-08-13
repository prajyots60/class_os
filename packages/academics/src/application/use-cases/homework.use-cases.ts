import { NotFoundError, ValidationError } from '@coaching-os/shared';
import { CAPABILITIES, requireCapability, type TenantContext } from '@coaching-os/identity';
import type { BatchRepository } from '@coaching-os/identity';
import { HomeworkEntity, type HomeworkDTO } from '../../domain/entities/homework.entity';
import type { HomeworkRepository } from '../../domain/repositories/homework.repository';
import {
  createHomeworkSchema,
  updateHomeworkSchema,
  listHomeworkForBatchSchema,
  type CreateHomeworkInput,
  type UpdateHomeworkInput,
} from '../../presentation/validators/homework.validator';

// ============================================================================
// 1. CreateHomeworkUseCase
// ============================================================================

export class CreateHomeworkUseCase {
  constructor(
    private readonly homeworkRepository: HomeworkRepository,
    private readonly batchRepository: BatchRepository,
  ) {}

  public async execute(
    context: TenantContext,
    command: CreateHomeworkInput,
  ): Promise<HomeworkDTO> {
    requireCapability(context, CAPABILITIES.ACADEMIC_WRITE);

    const validated = createHomeworkSchema.parse(command);

    // Verify batch belongs to tenant (HOMEWORK-001)
    const batch = await this.batchRepository.findById(context.instituteId, validated.batchId);
    if (!batch || batch.instituteId !== context.instituteId) {
      throw new NotFoundError(
        `Target batch "${validated.batchId}" not found in institute "${context.instituteId}".`,
      );
    }

    // Create entity in DRAFT state (publishedAt = null)
    const homework = HomeworkEntity.create({
      instituteId: context.instituteId, // Derived strictly from server context
      batchId: validated.batchId,
      title: validated.title,
      description: validated.description,
      attachmentUrl: validated.attachmentUrl,
    });

    const saved = await this.homeworkRepository.create(homework);
    return saved.toDTO();
  }
}

// ============================================================================
// 2. GetHomeworkUseCase
// ============================================================================

export class GetHomeworkUseCase {
  constructor(private readonly homeworkRepository: HomeworkRepository) {}

  public async execute(context: TenantContext, homeworkId: string): Promise<HomeworkDTO> {
    requireCapability(context, CAPABILITIES.ACADEMIC_READ);

    if (!homeworkId || homeworkId.trim() === '') {
      throw new ValidationError('Homework ID cannot be empty.');
    }

    const homework = await this.homeworkRepository.findById(context.instituteId, homeworkId);
    if (!homework) {
      throw new NotFoundError(
        `Homework with ID "${homeworkId}" not found in institute "${context.instituteId}".`,
      );
    }

    return homework.toDTO();
  }
}

// ============================================================================
// 3. ListHomeworkForBatchUseCase
// ============================================================================

export class ListHomeworkForBatchUseCase {
  constructor(
    private readonly homeworkRepository: HomeworkRepository,
    private readonly batchRepository: BatchRepository,
  ) {}

  public async execute(context: TenantContext, batchId: string): Promise<HomeworkDTO[]> {
    requireCapability(context, CAPABILITIES.ACADEMIC_READ);

    listHomeworkForBatchSchema.parse({ batchId });

    // Verify batch belongs to tenant
    const batch = await this.batchRepository.findById(context.instituteId, batchId);
    if (!batch || batch.instituteId !== context.instituteId) {
      throw new NotFoundError(
        `Batch with ID "${batchId}" not found in institute "${context.instituteId}".`,
      );
    }

    const records = await this.homeworkRepository.listByBatch(context.instituteId, batchId);
    return records.map((r) => r.toDTO());
  }
}

// ============================================================================
// 4. UpdateHomeworkUseCase
// ============================================================================

export class UpdateHomeworkUseCase {
  constructor(private readonly homeworkRepository: HomeworkRepository) {}

  public async execute(
    context: TenantContext,
    homeworkId: string,
    command: UpdateHomeworkInput,
  ): Promise<HomeworkDTO> {
    requireCapability(context, CAPABILITIES.ACADEMIC_WRITE);

    if (!homeworkId || homeworkId.trim() === '') {
      throw new ValidationError('Homework ID cannot be empty.');
    }

    const validated = updateHomeworkSchema.parse(command);

    const homework = await this.homeworkRepository.findById(context.instituteId, homeworkId);
    if (!homework) {
      throw new NotFoundError(
        `Homework with ID "${homeworkId}" not found in institute "${context.instituteId}".`,
      );
    }

    // Enforce publication immutability
    homework.updateDetails(validated);

    const updated = await this.homeworkRepository.update(homework);
    return updated.toDTO();
  }
}

// ============================================================================
// 5. PublishHomeworkUseCase
// ============================================================================

export class PublishHomeworkUseCase {
  constructor(private readonly homeworkRepository: HomeworkRepository) {}

  public async execute(
    context: TenantContext,
    homeworkId: string,
    publishedAt?: Date,
  ): Promise<HomeworkDTO> {
    requireCapability(context, CAPABILITIES.ACADEMIC_WRITE);

    if (!homeworkId || homeworkId.trim() === '') {
      throw new ValidationError('Homework ID cannot be empty.');
    }

    const homework = await this.homeworkRepository.findById(context.instituteId, homeworkId);
    if (!homework) {
      throw new NotFoundError(
        `Homework with ID "${homeworkId}" not found in institute "${context.instituteId}".`,
      );
    }

    // Assign server timestamp and mark published
    homework.publish(publishedAt);

    const published = await this.homeworkRepository.update(homework);
    return published.toDTO();
  }
}

// ============================================================================
// 6. DeleteHomeworkUseCase
// ============================================================================

export class DeleteHomeworkUseCase {
  constructor(private readonly homeworkRepository: HomeworkRepository) {}

  public async execute(context: TenantContext, homeworkId: string): Promise<boolean> {
    requireCapability(context, CAPABILITIES.ACADEMIC_WRITE);

    if (!homeworkId || homeworkId.trim() === '') {
      throw new ValidationError('Homework ID cannot be empty.');
    }

    const homework = await this.homeworkRepository.findById(context.instituteId, homeworkId);
    if (!homework) {
      throw new NotFoundError(
        `Homework with ID "${homeworkId}" not found in institute "${context.instituteId}".`,
      );
    }

    return this.homeworkRepository.delete(context.instituteId, homeworkId);
  }
}
