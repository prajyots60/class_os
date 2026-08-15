import { describe, it, expect, beforeEach } from 'vitest';
import { NotFoundError, ConflictError } from '@coaching-os/shared';
import { ChildProfileEntity } from '../../domain/entities/child-profile.entity';
import { StudentLinkEntity } from '../../domain/entities/student-link.entity';
import type { ChildProfileRepository } from '../../domain/repositories/child-profile.repository';
import type { StudentLinkRepository } from '../../domain/repositories/student-link.repository';

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

class InMemoryStudentLinkRepository implements StudentLinkRepository {
  private links = new Map<string, StudentLinkEntity>();

  async create(link: StudentLinkEntity): Promise<StudentLinkEntity> {
    const existing = await this.findByChildProfileAndStudent(link.childProfileId, link.studentId);
    if (existing) {
      throw new ConflictError('Student is already linked to this child profile');
    }
    this.links.set(link.id, link);
    return link;
  }

  async findById(id: string): Promise<StudentLinkEntity | null> {
    return this.links.get(id) ?? null;
  }

  async findByChildProfileId(childProfileId: string): Promise<StudentLinkEntity[]> {
    return Array.from(this.links.values()).filter((l) => l.childProfileId === childProfileId);
  }

  async findByChildProfileAndStudent(
    childProfileId: string,
    studentId: string,
  ): Promise<StudentLinkEntity | null> {
    for (const link of this.links.values()) {
      if (link.childProfileId === childProfileId && link.studentId === studentId) {
        return link;
      }
    }
    return null;
  }

  async delete(id: string): Promise<void> {
    this.links.delete(id);
  }
}

describe('StudentLink Use Cases Suite', () => {
  let childProfileRepo: InMemoryChildProfileRepository;
  let studentLinkRepo: InMemoryStudentLinkRepository;
  let parentIdentityId: string;
  let profile: ChildProfileEntity;

  beforeEach(async () => {
    childProfileRepo = new InMemoryChildProfileRepository();
    studentLinkRepo = new InMemoryStudentLinkRepository();
    parentIdentityId = crypto.randomUUID();

    profile = await childProfileRepo.create(
      ChildProfileEntity.create({ parentIdentityId, name: 'Rahul' }),
    );
  });

  it('verifies that unlinking hard deletes join link from repository', async () => {
    const link = await studentLinkRepo.create(
      StudentLinkEntity.create({
        childProfileId: profile.id,
        studentId: crypto.randomUUID(),
        instituteId: crypto.randomUUID(),
      }),
    );

    expect(await studentLinkRepo.findById(link.id)).not.toBeNull();
    await studentLinkRepo.delete(link.id);
    expect(await studentLinkRepo.findById(link.id)).toBeNull();
  });

  it('rejects duplicate link creation with ConflictError', async () => {
    const studentId = crypto.randomUUID();
    const instituteId = crypto.randomUUID();

    await studentLinkRepo.create(
      StudentLinkEntity.create({
        childProfileId: profile.id,
        studentId,
        instituteId,
      }),
    );

    await expect(
      studentLinkRepo.create(
        StudentLinkEntity.create({
          childProfileId: profile.id,
          studentId,
          instituteId,
        }),
      ),
    ).rejects.toThrow(ConflictError);
  });
});
