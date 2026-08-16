import type { ParentHubDTO } from '../../application/dto/parent-hub.dto';

export interface ParentHubRepository {
  getHubByParentIdentityId(parentIdentityId: string): Promise<ParentHubDTO>;
}
