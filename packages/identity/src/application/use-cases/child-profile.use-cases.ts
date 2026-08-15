import { NotFoundError } from '@coaching-os/shared';
import { ChildProfileEntity } from '../../domain/entities/child-profile.entity';
import type { ChildProfileRepository } from '../../domain/repositories/child-profile.repository';
import type {
  ChildProfileDTO,
  CreateChildProfileInput,
  UpdateChildProfileInput,
} from '../dto/child-profile.dto';

export class CreateChildProfileUseCase {
  constructor(private readonly repository: ChildProfileRepository) {}

  async execute(
    parentIdentityId: string,
    input: CreateChildProfileInput,
  ): Promise<ChildProfileDTO> {
    const profile = ChildProfileEntity.create({
      parentIdentityId,
      name: input.name,
      avatar: input.avatar ?? null,
    });

    const saved = await this.repository.create(profile);
    return saved.toDTO();
  }
}

export class GetChildProfileUseCase {
  constructor(private readonly repository: ChildProfileRepository) {}

  async execute(
    parentIdentityId: string,
    childProfileId: string,
  ): Promise<ChildProfileDTO> {
    const profile = await this.repository.findById(childProfileId);

    // Universal 404 Masking: if profile does not exist or belongs to another parent, return 404 NotFoundError
    if (!profile || profile.parentIdentityId !== parentIdentityId) {
      throw new NotFoundError('Child profile not found');
    }

    return profile.toDTO();
  }
}

export class ListChildProfilesUseCase {
  constructor(private readonly repository: ChildProfileRepository) {}

  async execute(parentIdentityId: string): Promise<ChildProfileDTO[]> {
    const profiles = await this.repository.findByParentIdentityId(parentIdentityId);
    return profiles.map((p) => p.toDTO());
  }
}

export class UpdateChildProfileUseCase {
  constructor(private readonly repository: ChildProfileRepository) {}

  async execute(
    parentIdentityId: string,
    childProfileId: string,
    input: UpdateChildProfileInput,
  ): Promise<ChildProfileDTO> {
    const profile = await this.repository.findById(childProfileId);

    // Universal 404 Masking
    if (!profile || profile.parentIdentityId !== parentIdentityId) {
      throw new NotFoundError('Child profile not found');
    }

    profile.updateDetails(input.name, input.avatar);
    const updated = await this.repository.update(profile);
    return updated.toDTO();
  }
}

export class DeleteChildProfileUseCase {
  constructor(private readonly repository: ChildProfileRepository) {}

  async execute(
    parentIdentityId: string,
    childProfileId: string,
  ): Promise<void> {
    const profile = await this.repository.findById(childProfileId);

    // Universal 404 Masking
    if (!profile || profile.parentIdentityId !== parentIdentityId) {
      throw new NotFoundError('Child profile not found');
    }

    await this.repository.delete(childProfileId);
  }
}
