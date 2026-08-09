import type { InstituteEntity, InstituteStatus } from '../entities/institute.entity';

export interface InstituteRepository {
  create(institute: InstituteEntity): Promise<InstituteEntity>;
  findById(id: string): Promise<InstituteEntity | null>;
  findBySlug(slug: string): Promise<InstituteEntity | null>;
  update(institute: InstituteEntity): Promise<InstituteEntity>;
  updateStatus(id: string, status: InstituteStatus): Promise<InstituteEntity>;
}
