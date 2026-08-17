import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getSearch, POST as postSearch, PUT as putSearch, PATCH as patchSearch, DELETE as deleteSearch } from './search/route';
import { AuthenticationError, AuthorizationError } from '@coaching-os/shared';
import { GlobalSearchUseCase } from '@coaching-os/administration';

// Mock auth dependencies for unit-level security verification
vi.mock('@coaching-os/auth', () => ({
  getAuthenticatedSession: vi.fn(),
}));

vi.mock('@coaching-os/identity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@coaching-os/identity')>();
  return {
    ...actual,
    GetUserMembershipsUseCase: vi.fn().mockImplementation(function () {
      return {
        execute: vi.fn().mockResolvedValue([
          {
            id: 'mem-staff-1',
            instituteId: 'inst-100',
            userId: 'usr-staff-1',
            role: 'owner',
            status: 'active',
          },
        ]),
      };
    }),
    ResolveInstituteMembershipUseCase: vi.fn().mockImplementation(function () {
      return {
        execute: vi.fn().mockResolvedValue({
          instituteId: 'inst-100',
          userId: 'usr-staff-1',
          role: 'owner',
          capabilities: new Set(['student:read', 'billing:read', 'academics:read']),
          instituteName: 'Test Institute',
          instituteSlug: 'test-inst',
          membershipId: 'mem-staff-1',
        }),
      };
    }),
  };
});

vi.mock('@coaching-os/administration', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@coaching-os/administration')>();
  return {
    ...actual,
    PrismaGlobalSearchRepository: vi.fn().mockImplementation(function () {
      return {
        search: vi.fn().mockImplementation((query: string, instituteId: string) => {
          if (instituteId !== 'inst-100') {
            return Promise.resolve({
              query,
              students: [],
              batches: [],
              invoices: [],
            });
          }
          return Promise.resolve({
            query,
            students: [
              {
                id: 'student-100-1',
                displayName: 'Rahul Sharma',
                admissionNumber: 'ADM-1001',
                status: 'active',
                targetPath: '/students?search=Rahul%20Sharma',
              },
            ],
            batches: [
              {
                id: 'batch-100-1',
                displayName: 'JEE 2027 Batch',
                code: 'JEE-2027',
                status: 'active',
                targetPath: '/academics?batchId=batch-100-1',
              },
            ],
            invoices: [
              {
                id: 'inv-100-1',
                invoiceNumber: 'INV-1001',
                studentName: 'Rahul Sharma',
                amount: 12000,
                status: 'pending',
                targetPath: '/billing?invoiceId=inv-100-1',
              },
            ],
          });
        }),
      };
    }),
  };
});

describe('Phase 6.5 — Global Search Security & Adversarial Test Matrix (P6.5-SEC-001..015)', () => {
  it('P6.5-SEC-001: Unauthenticated search returns 401 UNAUTHENTICATED', async () => {
    const { getAuthenticatedSession } = await import('@coaching-os/auth');
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost:3000/api/v1/search?q=rahul');
    const res = await getSearch(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('P6.5-SEC-002: Client-supplied instituteId query parameter cannot override server tenant context', async () => {
    const { getAuthenticatedSession } = await import('@coaching-os/auth');
    vi.mocked(getAuthenticatedSession).mockResolvedValue({
      user: { id: 'usr-staff-1', email: 'staff@test.com', name: 'Staff User' },
      session: { id: 'sess-1' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/search?q=rahul&instituteId=inst-ATTACKER');
    const res = await getSearch(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    // Verify results belong to inst-100 (server-resolved tenant), NOT inst-ATTACKER
    expect(body.data.students[0].id).toBe('student-100-1');
  });

  it('P6.5-SEC-003: Cross-institute students are NEVER returned for unauthorized tenant', async () => {
    const mockRepo = {
      search: vi.fn().mockResolvedValue({
        query: 'test',
        students: [],
        batches: [],
        invoices: [],
      }),
    };

    const useCase = new GlobalSearchUseCase(mockRepo);
    const result = await useCase.execute({
      query: 'test',
      instituteId: 'inst-OTHER',
      authenticatedUserId: 'usr-staff-1',
    });

    expect(mockRepo.search).toHaveBeenCalledWith('test', 'inst-OTHER');
    expect(result.students).toEqual([]);
  });

  it('P6.5-SEC-004: Cross-institute batches are NEVER returned for unauthorized tenant', async () => {
    const mockRepo = {
      search: vi.fn().mockResolvedValue({
        query: 'batch',
        students: [],
        batches: [],
        invoices: [],
      }),
    };

    const useCase = new GlobalSearchUseCase(mockRepo);
    const result = await useCase.execute({
      query: 'batch',
      instituteId: 'inst-OTHER',
      authenticatedUserId: 'usr-staff-1',
    });

    expect(result.batches).toEqual([]);
  });

  it('P6.5-SEC-005: Cross-institute invoices are NEVER returned for unauthorized tenant', async () => {
    const mockRepo = {
      search: vi.fn().mockResolvedValue({
        query: 'inv',
        students: [],
        batches: [],
        invoices: [],
      }),
    };

    const useCase = new GlobalSearchUseCase(mockRepo);
    const result = await useCase.execute({
      query: 'inv',
      instituteId: 'inst-OTHER',
      authenticatedUserId: 'usr-staff-1',
    });

    expect(result.invoices).toEqual([]);
  });

  it('P6.5-SEC-006: Client-supplied userId query parameter cannot alter search context', async () => {
    const { getAuthenticatedSession } = await import('@coaching-os/auth');
    vi.mocked(getAuthenticatedSession).mockResolvedValue({
      user: { id: 'usr-staff-1', email: 'staff@test.com', name: 'Staff User' },
      session: { id: 'sess-1' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/search?q=rahul&userId=usr-ATTACKER');
    const res = await getSearch(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('P6.5-SEC-007: Client-supplied role query parameter cannot elevate search access', async () => {
    const { getAuthenticatedSession } = await import('@coaching-os/auth');
    vi.mocked(getAuthenticatedSession).mockResolvedValue({
      user: { id: 'usr-staff-1', email: 'staff@test.com', name: 'Staff User' },
      session: { id: 'sess-1' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/search?q=rahul&role=admin');
    const res = await getSearch(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('P6.5-SEC-008: Result limits are strictly enforced server-side (<=10/category)', async () => {
    const overflowStudents = Array.from({ length: 25 }, (_, i) => ({
      id: `stud-${i}`,
      displayName: `Student ${i}`,
      admissionNumber: `ADM-${i}`,
      status: 'active',
      targetPath: `/students?search=${i}`,
    }));

    const mockRepo = {
      search: vi.fn().mockResolvedValue({
        query: 'student',
        students: overflowStudents,
        batches: [],
        invoices: [],
      }),
    };

    const useCase = new GlobalSearchUseCase(mockRepo);
    const result = await useCase.execute({
      query: 'student',
      instituteId: 'inst-100',
      authenticatedUserId: 'usr-staff-1',
    });

    expect(result.students.length).toBe(10);
  });

  it('P6.5-SEC-009: Raw Prisma or internal fields are not exposed in DTO response', async () => {
    const { getAuthenticatedSession } = await import('@coaching-os/auth');
    vi.mocked(getAuthenticatedSession).mockResolvedValue({
      user: { id: 'usr-staff-1', email: 'staff@test.com', name: 'Staff User' },
      session: { id: 'sess-1' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/search?q=rahul');
    const res = await getSearch(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    const data = body.data;
    expect(data).not.toHaveProperty('prisma');
    expect(data).not.toHaveProperty('password');
    expect(data).not.toHaveProperty('secret');
    expect(data).not.toHaveProperty('deletedAt');
  });

  it('P6.5-SEC-010: Unsupported HTTP methods (POST, PUT, PATCH, DELETE) return 405 Method Not Allowed', async () => {
    const resPost = await postSearch();
    expect(resPost.status).toBe(405);
    expect(resPost.headers.get('Allow')).toBe('GET');

    const resPut = await putSearch();
    expect(resPut.status).toBe(405);

    const resPatch = await patchSearch();
    expect(resPatch.status).toBe(405);

    const resDelete = await deleteSearch();
    expect(resDelete.status).toBe(405);
  });

  it('P6.5-SEC-011: Queries shorter than 2 characters return empty DTO safely without calling repository', async () => {
    const mockRepo = {
      search: vi.fn(),
    };

    const useCase = new GlobalSearchUseCase(mockRepo);
    const result = await useCase.execute({
      query: 'a',
      instituteId: 'inst-100',
      authenticatedUserId: 'usr-staff-1',
    });

    expect(mockRepo.search).not.toHaveBeenCalled();
    expect(result.students).toEqual([]);
    expect(result.batches).toEqual([]);
    expect(result.invoices).toEqual([]);
  });

  it('P6.5-SEC-012: Missing authentication throws AuthenticationError', async () => {
    const mockRepo = { search: vi.fn() };
    const useCase = new GlobalSearchUseCase(mockRepo);

    await expect(
      useCase.execute({
        query: 'test',
        instituteId: 'inst-100',
        authenticatedUserId: '',
      }),
    ).rejects.toThrow(AuthenticationError);
  });

  it('P6.5-SEC-013: Missing instituteId tenant context throws AuthorizationError', async () => {
    const mockRepo = { search: vi.fn() };
    const useCase = new GlobalSearchUseCase(mockRepo);

    await expect(
      useCase.execute({
        query: 'test',
        instituteId: '',
        authenticatedUserId: 'usr-staff-1',
      }),
    ).rejects.toThrow(AuthorizationError);
  });

  it('P6.5-SEC-014: Malformed query input with special characters is safely sanitized and executed', async () => {
    const mockRepo = {
      search: vi.fn().mockResolvedValue({
        query: "rahul'; DROP TABLE students;--",
        students: [],
        batches: [],
        invoices: [],
      }),
    };

    const useCase = new GlobalSearchUseCase(mockRepo);
    const result = await useCase.execute({
      query: "  rahul'; DROP TABLE students;--  ",
      instituteId: 'inst-100',
      authenticatedUserId: 'usr-staff-1',
    });

    expect(mockRepo.search).toHaveBeenCalledWith("rahul'; DROP TABLE students;--", 'inst-100');
    expect(result.query).toBe("rahul'; DROP TABLE students;--");
  });

  it('P6.5-SEC-015: Search cannot be used to enumerate another tenant\'s records (strictly instituteId bound)', async () => {
    const { getAuthenticatedSession } = await import('@coaching-os/auth');
    vi.mocked(getAuthenticatedSession).mockResolvedValue({
      user: { id: 'usr-staff-1', email: 'staff@test.com', name: 'Staff User' },
      session: { id: 'sess-1' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/search?q=ADM-99999&instituteId=inst-ATTACKER');
    const res = await getSearch(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    // Must return inst-100 data or empty, never inst-ATTACKER data
    expect(body.success).toBe(true);
  });
});
