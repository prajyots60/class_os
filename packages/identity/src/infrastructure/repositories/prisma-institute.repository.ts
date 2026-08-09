import { db, type Institute as PrismaInstitute } from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { InstituteEntity, type InstituteStatus } from '../../domain/entities/institute.entity';
import type { InstituteRepository } from '../../domain/repositories/institute.repository';

export class PrismaInstituteRepository implements InstituteRepository {
  private toDomain(prismaModel: PrismaInstitute): InstituteEntity {
    return InstituteEntity.from({
      id: prismaModel.id,
      name: prismaModel.name,
      slug: prismaModel.slug,
      phone: prismaModel.phone,
      email: prismaModel.email,
      logoUrl: prismaModel.logoUrl,
      primaryColor: prismaModel.primaryColor,
      timezone: prismaModel.timezone,
      status: prismaModel.status as InstituteStatus,
      createdAt: prismaModel.createdAt,
      updatedAt: prismaModel.updatedAt,
    });
  }

  public async create(institute: InstituteEntity): Promise<InstituteEntity> {
    try {
      const created = await db.institute.create({
        data: {
          id: institute.id,
          name: institute.name,
          slug: institute.slug,
          phone: institute.phone,
          email: institute.email,
          logoUrl: institute.logoUrl,
          primaryColor: institute.primaryColor,
          timezone: institute.timezone,
          status: institute.status,
          createdAt: institute.createdAt,
          updatedAt: institute.updatedAt,
        },
      });
      return this.toDomain(created);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(`An institute with slug '${institute.slug}' already exists.`);
      }
      throw error;
    }
  }

  public async findById(id: string): Promise<InstituteEntity | null> {
    const found = await db.institute.findUnique({
      where: { id },
    });
    if (!found) {
      return null;
    }
    return this.toDomain(found);
  }

  public async findBySlug(slug: string): Promise<InstituteEntity | null> {
    const found = await db.institute.findUnique({
      where: { slug },
    });
    if (!found) {
      return null;
    }
    return this.toDomain(found);
  }

  public async update(institute: InstituteEntity): Promise<InstituteEntity> {
    try {
      const updated = await db.institute.update({
        where: { id: institute.id },
        data: {
          name: institute.name,
          slug: institute.slug,
          phone: institute.phone,
          email: institute.email,
          logoUrl: institute.logoUrl,
          primaryColor: institute.primaryColor,
          timezone: institute.timezone,
          status: institute.status,
          updatedAt: institute.updatedAt,
        },
      });
      return this.toDomain(updated);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(`An institute with slug '${institute.slug}' already exists.`);
      }
      if (error?.code === 'P2025') {
        throw new NotFoundError(`Institute with ID ${institute.id} not found.`);
      }
      throw error;
    }
  }

  public async updateStatus(id: string, status: InstituteStatus): Promise<InstituteEntity> {
    try {
      const updated = await db.institute.update({
        where: { id },
        data: {
          status,
          updatedAt: new Date(),
        },
      });
      return this.toDomain(updated);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError(`Institute with ID ${id} not found.`);
      }
      throw error;
    }
  }
}
