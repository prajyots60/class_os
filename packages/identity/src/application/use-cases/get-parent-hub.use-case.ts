import type { ParentHubDTO } from '../dto/parent-hub.dto';
import type { ParentHubRepository } from '../../domain/repositories/parent-hub.repository';
import { PrismaParentHubRepository } from '../../infrastructure/repositories/prisma-parent-hub.repository';

export class GetParentHubUseCase {
  constructor(
    private readonly repository: ParentHubRepository = new PrismaParentHubRepository(),
  ) {}

  async execute(parentIdentityId: string): Promise<ParentHubDTO> {
    return this.repository.getHubByParentIdentityId(parentIdentityId);
  }
}
