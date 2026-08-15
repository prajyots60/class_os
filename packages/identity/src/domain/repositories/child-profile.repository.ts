import type { ChildProfileEntity } from '../entities/child-profile.entity';

export interface ChildProfileRepository {
  create(profile: ChildProfileEntity): Promise<ChildProfileEntity>;
  findById(id: string): Promise<ChildProfileEntity | null>;
  findByParentIdentityId(parentIdentityId: string): Promise<ChildProfileEntity[]>;
  update(profile: ChildProfileEntity): Promise<ChildProfileEntity>;
  delete(id: string): Promise<void>;
}
