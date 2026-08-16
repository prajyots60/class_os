import { describe, it, expect } from 'vitest';
import { GetParentHubUseCase } from './get-parent-hub.use-case';
import type { ParentHubRepository } from '../../domain/repositories/parent-hub.repository';
import type { ParentHubDTO } from '../dto/parent-hub.dto';

class InMemoryParentHubRepository implements ParentHubRepository {
  private hubData: Map<string, ParentHubDTO> = new Map();

  setHubData(parentIdentityId: string, data: ParentHubDTO) {
    this.hubData.set(parentIdentityId, data);
  }

  async getHubByParentIdentityId(parentIdentityId: string): Promise<ParentHubDTO> {
    const data = this.hubData.get(parentIdentityId);
    if (!data) {
      return {
        parent: {
          id: parentIdentityId,
          phone: '+919999999999',
          name: 'Parent User',
          avatar: null,
          status: 'active',
        },
        profiles: [],
        institutes: [],
        meta: {
          totalProfiles: 0,
          totalLinks: 0,
          totalInstitutes: 0,
        },
      };
    }
    return data;
  }
}

describe('GetParentHubUseCase Unit Tests', () => {
  it('returns empty hub state for parent with 0 profiles', async () => {
    const repo = new InMemoryParentHubRepository();
    const useCase = new GetParentHubUseCase(repo);

    const result = await useCase.execute('parent-123');

    expect(result.parent.id).toBe('parent-123');
    expect(result.profiles).toHaveLength(0);
    expect(result.institutes).toHaveLength(0);
    expect(result.meta.totalProfiles).toBe(0);
    expect(result.meta.totalLinks).toBe(0);
    expect(result.meta.totalInstitutes).toBe(0);
  });

  it('aggregates cross-institute student links and deduplicates institute summaries', async () => {
    const repo = new InMemoryParentHubRepository();
    const parentIdentityId = 'parent-456';

    const mockData: ParentHubDTO = {
      parent: {
        id: parentIdentityId,
        phone: '+919876543210',
        name: 'Sharma Parent',
        avatar: null,
        status: 'active',
      },
      profiles: [
        {
          id: 'profile-1',
          name: 'Rahul',
          avatar: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          linkedStudents: [
            {
              linkId: 'link-1',
              studentId: 'student-1',
              instituteId: 'inst-A',
              instituteName: 'Alpha Academy',
              admissionNumber: 'ADM-001',
              firstName: 'Rahul',
              middleName: null,
              lastName: 'Sharma',
              fullName: 'Rahul Sharma',
              status: 'active',
              enrollments: [
                {
                  id: 'enr-1',
                  batchId: 'batch-1',
                  batchName: 'Batch 2026',
                  status: 'active',
                },
              ],
            },
            {
              linkId: 'link-2',
              studentId: 'student-2',
              instituteId: 'inst-B',
              instituteName: 'Beta Coaching',
              admissionNumber: 'ADM-002',
              firstName: 'Rahul',
              middleName: null,
              lastName: 'Sharma',
              fullName: 'Rahul Sharma',
              status: 'active',
              enrollments: [],
            },
          ],
        },
      ],
      institutes: [
        { id: 'inst-A', name: 'Alpha Academy', slug: 'alpha', studentCount: 1 },
        { id: 'inst-B', name: 'Beta Coaching', slug: 'beta', studentCount: 1 },
      ],
      meta: {
        totalProfiles: 1,
        totalLinks: 2,
        totalInstitutes: 2,
      },
    };

    repo.setHubData(parentIdentityId, mockData);

    const useCase = new GetParentHubUseCase(repo);
    const result = await useCase.execute(parentIdentityId);

    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0].linkedStudents).toHaveLength(2);
    expect(result.institutes).toHaveLength(2);
    expect(result.meta.totalLinks).toBe(2);
  });
});
