import type {
  InstituteParentEntity,
  InstituteParentStatus,
} from '../../domain/entities/institute-parent.entity';
import type { ParentIdentityEntity } from '../../domain/entities/parent-identity.entity';
import {
  toParentIdentityDTO,
  type ParentIdentityDTO,
} from './parent-identity.dto';

export interface InstituteParentDTO {
  id: string;
  instituteId: string;
  parentIdentityId: string;
  notes: string | null;
  status: InstituteParentStatus;
  parentIdentity?: ParentIdentityDTO;
  createdAt: Date;
  updatedAt: Date;
}

export function toInstituteParentDTO(
  entity: InstituteParentEntity,
  parentIdentity?: ParentIdentityEntity | ParentIdentityDTO,
): InstituteParentDTO {
  let parentIdentityDTO: ParentIdentityDTO | undefined = undefined;

  if (parentIdentity) {
    if ('phone' in parentIdentity && typeof parentIdentity.phone === 'object') {
      parentIdentityDTO = toParentIdentityDTO(parentIdentity as ParentIdentityEntity);
    } else {
      parentIdentityDTO = parentIdentity as ParentIdentityDTO;
    }
  }

  return {
    id: entity.id,
    instituteId: entity.instituteId,
    parentIdentityId: entity.parentIdentityId,
    notes: entity.notes,
    status: entity.status,
    ...(parentIdentityDTO ? { parentIdentity: parentIdentityDTO } : {}),
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
