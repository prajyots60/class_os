import type { ParentIdentityEntity } from '../../domain/entities/parent-identity.entity';
import type { ParentIdentityStatus } from '../../domain/entities/parent-identity.entity';

export interface ParentIdentityDTO {
  id: string;
  phone: string;
  name: string | null;
  avatar: string | null;
  status: ParentIdentityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export function toParentIdentityDTO(entity: ParentIdentityEntity): ParentIdentityDTO {
  return {
    id: entity.id,
    phone: entity.phone.value,
    name: entity.name,
    avatar: entity.avatar,
    status: entity.status,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
