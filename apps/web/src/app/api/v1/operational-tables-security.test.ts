import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getStudents, POST as postStudents } from './students/route';
import { GET as getInvoices } from './invoices/route';
import { GET as getSessions } from './academics/sessions/route';
import { getAuthenticatedSession } from '@coaching-os/auth';
import { db } from '@coaching-os/database';

vi.mock('@coaching-os/auth', () => ({
  getAuthenticatedSession: vi.fn(),
}));

vi.mock('@coaching-os/identity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@coaching-os/identity')>();
  return {
    ...actual,
    GetUserMembershipsUseCase: vi.fn().mockImplementation(function () {
      return {
        execute: vi.fn().mockImplementation(({ userId }: { userId: string }) => {
          if (userId === 'user-no-mem') return Promise.resolve([]);
          if (userId === 'user-parent-1') {
            return Promise.resolve([
              { id: 'mem-3', instituteId: 'inst-001', userId: 'user-parent-1', role: 'parent', status: 'active' },
            ]);
          }
          if (userId === 'user-teacher-1') {
            return Promise.resolve([
              { id: 'mem-2', instituteId: 'inst-001', userId: 'user-teacher-1', role: 'teacher', status: 'active' },
            ]);
          }
          return Promise.resolve([
            { id: 'mem-1', instituteId: 'inst-001', userId: 'user-owner-1', role: 'owner', status: 'active' },
          ]);
        }),
      };
    }),
    ResolveInstituteMembershipUseCase: vi.fn().mockImplementation(function () {
      return {
        execute: vi.fn().mockImplementation(({ userId }: { userId: string }) => {
          const role: 'parent' | 'teacher' | 'owner' =
            userId === 'user-parent-1' ? 'parent' : userId === 'user-teacher-1' ? 'teacher' : 'owner';
          const memId = userId === 'user-parent-1' ? 'mem-3' : userId === 'user-teacher-1' ? 'mem-2' : 'mem-1';
          return Promise.resolve({
            instituteId: 'inst-001',
            userId,
            role,
            status: 'active',
            capabilities: actual.getCapabilitiesForRole(role),
            instituteName: 'Test Inst',
            instituteSlug: 'test-inst',
            membershipId: memId,
          });
        }),
      };
    }),


  };
});

vi.mock('@coaching-os/database', () => ({

  db: {
    student: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    batchSession: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe('Phase 6.6 — Operational Tables Security & API Test Suite (P6.6-SEC-001..024)', () => {
  const mockStaffSession = {
    user: { id: 'user-owner-1', email: 'owner@institute.com', name: 'Owner User' },
    session: { id: 'sess-1', userId: 'user-owner-1' },
    memberships: [
      {
        id: 'mem-1',
        instituteId: 'inst-001',
        role: 'owner',
        status: 'active',
      },
    ],
  };

  const mockTeacherSession = {
    user: { id: 'user-teacher-1', email: 'teacher@institute.com', name: 'Teacher User' },
    session: { id: 'sess-2', userId: 'user-teacher-1' },
    memberships: [
      {
        id: 'mem-2',
        instituteId: 'inst-001',
        role: 'teacher',
        status: 'active',
      },
    ],
  };

  const mockParentSession = {
    user: { id: 'user-parent-1', email: 'parent@home.com', name: 'Parent User' },
    session: { id: 'sess-3', userId: 'user-parent-1' },
    memberships: [
      {
        id: 'mem-3',
        instituteId: 'inst-001',
        role: 'parent',
        status: 'active',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedSession).mockResolvedValue(
      mockStaffSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>,
    );


    vi.mocked(db.student.findMany).mockResolvedValue([]);
    vi.mocked(db.student.count).mockResolvedValue(0);
    vi.mocked(db.invoice.findMany).mockResolvedValue([]);
    vi.mocked(db.invoice.count).mockResolvedValue(0);
    vi.mocked(db.batchSession.findMany).mockResolvedValue([]);
    vi.mocked(db.batchSession.count).mockResolvedValue(0);
  });

  // ─── Students Table Security ───────────────────────────────────────────────

  it('P6.6-SEC-001: GET /api/v1/students requires authenticated session context', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost:3000/api/v1/students');
    const res = await getStudents(req);
    expect(res.status).toBe(401);
  });


  it('P6.6-SEC-002: GET /api/v1/students ignores client-supplied instituteId query parameter', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/students?instituteId=ATTACKER_INSTITUTE');
    const res = await getStudents(req);
    expect(res.status).toBe(200);

    // Verify Prisma queried inst-001 (from session), not ATTACKER_INSTITUTE
    expect(db.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ instituteId: 'inst-001' }),
      })
    );
  });

  it('P6.6-SEC-003: GET /api/v1/students caps pageSize at MAX_PAGE_SIZE (100)', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/students?pageSize=500');
    const res = await getStudents(req);
    expect(res.status).toBe(400); // Zod validation failure for exceeding max page size
  });

  it('P6.6-SEC-004: GET /api/v1/students rejects invalid status enum', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/students?status=INVALID_STATUS');
    const res = await getStudents(req);
    expect(res.status).toBe(400);
  });

  it('P6.6-SEC-005: POST /api/v1/students returns 405 Method Not Allowed', async () => {
    const res = await postStudents();
    expect(res.status).toBe(405);
  });

  it('P6.6-SEC-006: GET /api/v1/students response includes request ID header', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/students');
    const res = await getStudents(req);
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('P6.6-SEC-007: GET /api/v1/students paginated response contains pagination metadata', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/students?page=1&pageSize=25');
    const res = await getStudents(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.pagination).toMatchObject({
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 0,
    });
  });


  // ─── Invoices Table Security ───────────────────────────────────────────────

  it('P6.6-SEC-008: GET /api/v1/invoices requires authenticated session context', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost:3000/api/v1/invoices');
    const res = await getInvoices(req);
    expect(res.status).toBe(401);
  });

  it('P6.6-SEC-009: GET /api/v1/invoices ignores client-supplied instituteId in query', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/invoices?instituteId=ATTACKER_INSTITUTE');
    const res = await getInvoices(req);
    expect(res.status).toBe(200);

    expect(db.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          billingPlan: expect.objectContaining({
            enrollment: expect.objectContaining({ instituteId: 'inst-001' }),
          }),
        }),
      })
    );
  });

  it('P6.6-SEC-010: GET /api/v1/invoices caps pageSize at MAX_PAGE_SIZE (100)', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/invoices?pageSize=999');
    const res = await getInvoices(req);
    expect(res.status).toBe(400);
  });

  it('P6.6-SEC-011: GET /api/v1/invoices rejects invalid status enum', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/invoices?status=CORRUPT_STATUS');
    const res = await getInvoices(req);
    expect(res.status).toBe(400);
  });

  it('P6.6-SEC-012: GET /api/v1/invoices response includes x-request-id', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/invoices');
    const res = await getInvoices(req);
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('P6.6-SEC-013: GET /api/v1/invoices supports search term safely', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/invoices?search=Rahul');
    const res = await getInvoices(req);
    expect(res.status).toBe(200);
  });

  it('P6.6-SEC-014: GET /api/v1/invoices supports sortBy=amount & sortOrder=asc', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/invoices?sortBy=amount&sortOrder=asc');
    const res = await getInvoices(req);
    expect(res.status).toBe(200);

    expect(db.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: expect.arrayContaining([{ amount: 'asc' }]),
      })
    );
  });

  // ─── Sessions Table Security ───────────────────────────────────────────────

  it('P6.6-SEC-015: GET /api/v1/academics/sessions requires authenticated session', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost:3000/api/v1/academics/sessions');
    const res = await getSessions(req);
    expect(res.status).toBe(401);
  });

  it('P6.6-SEC-016: GET /api/v1/academics/sessions blocks Parent role with 403 Forbidden', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(
      mockParentSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>,
    );
    const req = new NextRequest('http://localhost:3000/api/v1/academics/sessions');
    const res = await getSessions(req);
    expect(res.status).toBe(403);
  });

  it('P6.6-SEC-017: GET /api/v1/academics/sessions restricts Teacher role to teacher sessions', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(
      mockTeacherSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>,
    );
    const req = new NextRequest('http://localhost:3000/api/v1/academics/sessions');
    const res = await getSessions(req);
    expect(res.status).toBe(200);



    // Verify teacherUserIdFilter restriction was passed to DB
    expect(db.batchSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { batch: { teacherId: 'user-teacher-1' } },
            { substituteTeacherId: 'user-teacher-1' },
          ],
        }),
      })
    );
  });

  it('P6.6-SEC-018: GET /api/v1/academics/sessions ignores client-supplied instituteId', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/academics/sessions?instituteId=ATTACKER_INSTITUTE');
    const res = await getSessions(req);
    expect(res.status).toBe(200);

    expect(db.batchSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ instituteId: 'inst-001' }),
      })
    );
  });

  it('P6.6-SEC-019: GET /api/v1/academics/sessions caps pageSize at MAX_PAGE_SIZE (100)', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/academics/sessions?pageSize=200');
    const res = await getSessions(req);
    expect(res.status).toBe(400);
  });

  it('P6.6-SEC-020: GET /api/v1/academics/sessions rejects invalid status enum', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/academics/sessions?status=BAD_STATUS');
    const res = await getSessions(req);
    expect(res.status).toBe(400);
  });

  it('P6.6-SEC-021: GET /api/v1/academics/sessions validates attendanceStatus enum (taken / pending)', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/academics/sessions?attendanceStatus=taken');
    const res = await getSessions(req);
    expect(res.status).toBe(200);
  });

  it('P6.6-SEC-022: GET /api/v1/academics/sessions rejects invalid attendanceStatus enum', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/academics/sessions?attendanceStatus=UNKNOWN');
    const res = await getSessions(req);
    expect(res.status).toBe(400);
  });

  it('P6.6-SEC-023: GET /api/v1/academics/sessions response contains correlation header x-request-id', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/academics/sessions');
    const res = await getSessions(req);
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('P6.6-SEC-024: GET /api/v1/academics/sessions returns paginated metadata', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/academics/sessions?page=2&pageSize=10');
    const res = await getSessions(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.pagination).toMatchObject({
      page: 2,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    });
  });

});
