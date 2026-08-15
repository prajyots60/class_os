import type { ParentIdentityDTO } from '../application/dto/parent-identity.dto';

export interface ParentAuthContext {
  parentIdentityId: string;
  userId: string;
  sessionId: string;
  parentIdentity: ParentIdentityDTO;
}
