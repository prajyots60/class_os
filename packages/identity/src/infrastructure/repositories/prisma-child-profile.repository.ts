import { db } from '@coaching-os/database';
import { ChildProfileEntity } from '../../domain/entities/child-profile.entity';
import type { ChildProfileRepository } from '../../domain/repositories/child-profile.repository';

export class PrismaChildProfileRepository implements ChildProfileRepository {
  private mapToEntity(record: {
    id: string;
    parentIdentityId: string;
    name: string;
    avatar: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ChildProfileEntity {
    return ChildProfileEntity.reconstruct({
      id: record.id,
      parentIdentityId: record.parentIdentityId,
      name: record.name,
      avatar: record.avatar,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async create(profile: ChildProfileEntity): Promise<ChildProfileEntity> {
    const record = await db.childProfile.create({
      data: {
        id: profile.id,
        parentIdentityId: profile.parentIdentityId,
        name: profile.name,
        avatar: profile.avatar,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });

    return this.mapToEntity(record);
  }

  async findById(id: string): Promise<ChildProfileEntity | null> {
    const record = await db.childProfile.findUnique({
      where: { id },
    });

    if (!record) {
      return null;
    }

    return this.mapToEntity(record);
  }

  async findByParentIdentityId(parentIdentityId: string): Promise<ChildProfileEntity[]> {
    const records = await db.childProfile.findMany({
      where: { parentIdentityId },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((record) => this.mapToEntity(record));
  }

  async update(profile: ChildProfileEntity): Promise<ChildProfileEntity> {
    const record = await db.childProfile.update({
      where: { id: profile.id },
      data: {
        name: profile.name,
        avatar: profile.avatar,
        updatedAt: profile.updatedAt,
      },
    });

    return this.mapToEntity(record);
  }

  async delete(id: string): Promise<void> {
    await db.childProfile.delete({
      where: { id },
    });
  }
}
