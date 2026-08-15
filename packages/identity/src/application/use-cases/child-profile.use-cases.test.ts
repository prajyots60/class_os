import { describe, it, expect, beforeEach } from 'vitest';
import { NotFoundError } from '@coaching-os/shared';
import { ChildProfileEntity } from '../../domain/entities/child-profile.entity';
import type { ChildProfileRepository } from '../../domain/repositories/child-profile.repository';
import {
  CreateChildProfileUseCase,
  GetChildProfileUseCase,
  ListChildProfilesUseCase,
  UpdateChildProfileUseCase,
  DeleteChildProfileUseCase,
} from './child-profile.use-cases';

class InMemoryChildProfileRepository implements ChildProfileRepository {
  private profiles = new Map<string, ChildProfileEntity>();

  async create(profile: ChildProfileEntity): Promise<ChildProfileEntity> {
    this.profiles.set(profile.id, profile);
    return profile;
  }

  async findById(id: string): Promise<ChildProfileEntity | null> {
    return this.profiles.get(id) ?? null;
  }

  async findByParentIdentityId(parentIdentityId: string): Promise<ChildProfileEntity[]> {
    return Array.from(this.profiles.values()).filter(
      (p) => p.parentIdentityId === parentIdentityId,
    );
  }

  async update(profile: ChildProfileEntity): Promise<ChildProfileEntity> {
    this.profiles.set(profile.id, profile);
    return profile;
  }

  async delete(id: string): Promise<void> {
    this.profiles.delete(id);
  }
}

describe('ChildProfile Use Cases Suite', () => {
  let repo: InMemoryChildProfileRepository;
  let parentIdentityId: string;

  beforeEach(() => {
    repo = new InMemoryChildProfileRepository();
    parentIdentityId = crypto.randomUUID();
  });

  it('creates and retrieves a child profile for a parent', async () => {
    const createUC = new CreateChildProfileUseCase(repo);
    const profileDTO = await createUC.execute(parentIdentityId, {
      name: 'Rahul',
      avatar: 'https://example.com/avatar.png',
    });

    expect(profileDTO.id).toBeDefined();
    expect(profileDTO.name).toBe('Rahul');

    const getUC = new GetChildProfileUseCase(repo);
    const fetched = await getUC.execute(parentIdentityId, profileDTO.id);
    expect(fetched.id).toBe(profileDTO.id);
  });

  it('enforces Universal 404 Masking when Parent B requests Parent A profile', async () => {
    const createUC = new CreateChildProfileUseCase(repo);
    const profileDTO = await createUC.execute(parentIdentityId, { name: 'Rahul' });

    const otherParentId = crypto.randomUUID();
    const getUC = new GetChildProfileUseCase(repo);

    await expect(getUC.execute(otherParentId, profileDTO.id)).rejects.toThrow(NotFoundError);
  });

  it('lists profiles for a parent', async () => {
    const createUC = new CreateChildProfileUseCase(repo);
    await createUC.execute(parentIdentityId, { name: 'Child 1' });
    await createUC.execute(parentIdentityId, { name: 'Child 2' });

    const listUC = new ListChildProfilesUseCase(repo);
    const profiles = await listUC.execute(parentIdentityId);
    expect(profiles).toHaveLength(2);
  });

  it('updates a child profile owned by parent', async () => {
    const createUC = new CreateChildProfileUseCase(repo);
    const profileDTO = await createUC.execute(parentIdentityId, { name: 'Old Name' });

    const updateUC = new UpdateChildProfileUseCase(repo);
    const updated = await updateUC.execute(parentIdentityId, profileDTO.id, {
      name: 'New Name',
    });
    expect(updated.name).toBe('New Name');
  });

  it('deletes a child profile owned by parent', async () => {
    const createUC = new CreateChildProfileUseCase(repo);
    const profileDTO = await createUC.execute(parentIdentityId, { name: 'To Delete' });

    const deleteUC = new DeleteChildProfileUseCase(repo);
    await deleteUC.execute(parentIdentityId, profileDTO.id);

    const getUC = new GetChildProfileUseCase(repo);
    await expect(getUC.execute(parentIdentityId, profileDTO.id)).rejects.toThrow(NotFoundError);
  });
});
