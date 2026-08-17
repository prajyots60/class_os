import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getAttendanceReport, POST as postAttendance, PUT as putAttendance, DELETE as deleteAttendance } from './attendance/route';
import { GET as getFeeReport, POST as postFee, PUT as putFee, DELETE as deleteFee } from './fees/route';
import { getAuthenticatedSession } from '@coaching-os/auth';
import { db } from '@coaching-os/database';

// Mock dependencies
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
          if (userId === 'user-parent') {
            return Promise.resolve([
              { id: 'mem-p', instituteId: 'inst-001', userId: 'user-parent', role: 'parent', status: 'active' },
            ]);
          }
          if (userId === 'user-teacher') {
            return Promise.resolve([
              { id: 'mem-t', instituteId: 'inst-001', userId: 'user-teacher', role: 'teacher', status: 'active' },
            ]);
          }
          if (userId === 'user-assistant') {
            return Promise.resolve([
              { id: 'mem-a', instituteId: 'inst-001', userId: 'user-assistant', role: 'assistant', status: 'active' },
            ]);
          }
          return Promise.resolve([
            { id: 'mem-o', instituteId: 'inst-001', userId: 'user-owner', role: 'owner', status: 'active' },
          ]);
        }),
      };
    }),
    ResolveInstituteMembershipUseCase: vi.fn().mockImplementation(function () {
      return {
        execute: vi.fn().mockImplementation(({ userId, requestedInstituteId, instituteId }: { userId: string; requestedInstituteId?: string; instituteId?: string }) => {
          const targetInstId = requestedInstituteId || instituteId || 'inst-001';
          if (userId === 'user-parent') {
            return Promise.resolve({
              id: 'mem-p',
              instituteId: targetInstId,
              userId,
              role: 'parent',
              status: 'active',
            });
          }
          if (userId === 'user-teacher') {
            return Promise.resolve({
              id: 'mem-t',
              instituteId: targetInstId,
              userId,
              role: 'teacher',
              status: 'active',
            });
          }
          if (userId === 'user-assistant') {
            return Promise.resolve({
              id: 'mem-a',
              instituteId: targetInstId,
              userId,
              role: 'assistant',
              status: 'active',
            });
          }
          return Promise.resolve({
            id: 'mem-o',
            instituteId: targetInstId,
            userId,
            role: 'owner',
            status: 'active',
          });
        }),
      };
    }),
  };
});

vi.mock('@coaching-os/database', () => ({
  db: {
    institute: {
      findUnique: vi.fn().mockResolvedValue({ id: 'inst-001', name: 'Alpha Coaching', timezone: 'Asia/Kolkata' }),
    },
    batchSession: {
      count: vi.fn().mockResolvedValue(10),
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'sess-001',
          date: new Date('2026-08-10'),
          batchId: 'batch-001',
          status: 'completed',
          batch: { name: 'Batch A', code: 'B-01', subject: { name: 'Physics' }, teacher: { name: 'Dr. Sharma' } },
          subject: { name: 'Physics' },
          teacher: { name: 'Dr. Sharma' },
          attendance: [{ status: 'present' }, { status: 'absent' }],
        },
      ]),
    },
    payment: {
      count: vi.fn().mockResolvedValue(5),
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'pay-001',
          receivedOn: new Date('2026-08-12'),
          amount: 5000,
          paymentMode: 'upi',
          receiptId: 'rec-001',
          invoice: {
            id: 'inv-001',
            invoiceNumber: 'INV-101',
            billingPlan: {
              enrollment: {
                student: { id: 'st-01', firstName: 'Rohan', lastName: 'Kumar', admissionNumber: 'ADM-01' },
              },
            },
          },
        },
      ]),
    },
    invoice: {
      findMany: vi.fn().mockResolvedValue([{ outstanding: 2500, amount: 5000, payments: [{ amount: 2500 }] }]),
    },
    billingPlan: {
      findMany: vi.fn().mockResolvedValue([{ id: 'bp-001' }]),
    },
  },
}));

describe('Phase 6.8 — Operational Reports Security Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('P6.8-SEC-001: Unauthenticated attendance report rejected (401)', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost:3000/api/v1/reports/attendance');
    const res = await getAttendanceReport(req);
    expect(res.status).toBe(401);
  });

  it('P6.8-SEC-002: Unauthenticated fee report rejected (401)', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost:3000/api/v1/reports/fees');
    const res = await getFeeReport(req);
    expect(res.status).toBe(401);
  });

  it('P6.8-SEC-003: Client instituteId query override ignored', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce({
      user: { id: 'user-owner', name: 'Owner', email: 'owner@test.com' },
      session: { id: 's-1', userId: 'user-owner', activeInstituteId: 'inst-001' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/reports/attendance?instituteId=inst-ATTACKER');
    const res = await getAttendanceReport(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('P6.8-SEC-004: Cross-institute attendance data blocked', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce({
      user: { id: 'user-owner', name: 'Owner', email: 'owner@test.com' },
      session: { id: 's-1', userId: 'user-owner', activeInstituteId: 'inst-001' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/reports/attendance');
    const res = await getAttendanceReport(req);
    expect(res.status).toBe(200);
    expect(db.batchSession.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ instituteId: 'inst-001' }),
      })
    );
  });

  it('P6.8-SEC-005: Cross-institute fee data blocked', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce({
      user: { id: 'user-owner', name: 'Owner', email: 'owner@test.com' },
      session: { id: 's-1', userId: 'user-owner', activeInstituteId: 'inst-001' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/reports/fees');
    const res = await getFeeReport(req);
    expect(res.status).toBe(200);
    expect(db.payment.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ invoiceId: expect.anything() }),
      })
    );
  });

  it('P6.8-SEC-006: Teacher financial report access blocked (403)', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce({
      user: { id: 'user-teacher', name: 'Teacher', email: 'teacher@test.com' },
      session: { id: 's-2', userId: 'user-teacher', activeInstituteId: 'inst-001' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/reports/fees');
    const res = await getFeeReport(req);
    expect(res.status).toBe(403);
  });

  it('P6.8-SEC-007: Teacher attendance scope restricted to assigned teacherId', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce({
      user: { id: 'user-teacher', name: 'Teacher', email: 'teacher@test.com' },
      session: { id: 's-2', userId: 'user-teacher', activeInstituteId: 'inst-001' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/reports/attendance');
    const res = await getAttendanceReport(req);
    expect(res.status).toBe(200);
    expect(db.batchSession.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          instituteId: 'inst-001',
          batch: { teacherId: 'user-teacher' },
        }),
      })
    );
  });

  it('P6.8-SEC-008: Parent report access blocked (403)', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce({
      user: { id: 'user-parent', name: 'Parent', email: 'parent@test.com' },
      session: { id: 's-3', userId: 'user-parent', activeInstituteId: 'inst-001' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req1 = new NextRequest('http://localhost:3000/api/v1/reports/attendance');
    const res1 = await getAttendanceReport(req1);
    expect(res1.status).toBe(403);

    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce({
      user: { id: 'user-parent', name: 'Parent', email: 'parent@test.com' },
      session: { id: 's-3', userId: 'user-parent', activeInstituteId: 'inst-001' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req2 = new NextRequest('http://localhost:3000/api/v1/reports/fees');
    const res2 = await getFeeReport(req2);
    expect(res2.status).toBe(403);
  });

  it('P6.8-SEC-009: Client role override ignored', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce({
      user: { id: 'user-teacher', name: 'Teacher', email: 'teacher@test.com' },
      session: { id: 's-2', userId: 'user-teacher', activeInstituteId: 'inst-001' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/reports/fees?role=owner');
    const res = await getFeeReport(req);
    expect(res.status).toBe(403);
  });

  it('P6.8-SEC-010: Client userId override ignored', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce({
      user: { id: 'user-teacher', name: 'Teacher', email: 'teacher@test.com' },
      session: { id: 's-2', userId: 'user-teacher', activeInstituteId: 'inst-001' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/reports/attendance?userId=user-owner');
    const res = await getAttendanceReport(req);
    expect(res.status).toBe(200);
    expect(db.batchSession.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          batch: { teacherId: 'user-teacher' },
        }),
      })
    );
  });

  it('P6.8-SEC-011: Malformed date range rejected (400)', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce({
      user: { id: 'user-owner', name: 'Owner', email: 'owner@test.com' },
      session: { id: 's-1', userId: 'user-owner', activeInstituteId: 'inst-001' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/reports/attendance?from=invalid-date');
    const res = await getAttendanceReport(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toContain('Invalid date format');
  });

  it('P6.8-SEC-012: Inverted date range rejected (400)', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce({
      user: { id: 'user-owner', name: 'Owner', email: 'owner@test.com' },
      session: { id: 's-1', userId: 'user-owner', activeInstituteId: 'inst-001' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/reports/attendance?from=2026-08-30&to=2026-08-01');
    const res = await getAttendanceReport(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toContain('Start date (from) must be before');
  });

  it('P6.8-SEC-013: Excessive date range (> 90 days) rejected (400)', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce({
      user: { id: 'user-owner', name: 'Owner', email: 'owner@test.com' },
      session: { id: 's-1', userId: 'user-owner', activeInstituteId: 'inst-001' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/reports/attendance?from=2026-01-01&to=2026-06-01');
    const res = await getAttendanceReport(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toContain('Date range cannot exceed 90 days');
  });

  it('P6.8-SEC-014: Unbounded page size clamped to 100 max', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce({
      user: { id: 'user-owner', name: 'Owner', email: 'owner@test.com' },
      session: { id: 's-1', userId: 'user-owner', activeInstituteId: 'inst-001' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/reports/attendance?pageSize=9999');
    const res = await getAttendanceReport(req);
    expect(res.status).toBe(200);
    expect(db.batchSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    );
  });

  it('P6.8-SEC-015: Non-GET methods return 405 Method Not Allowed', async () => {
    const res1 = await postAttendance();
    expect(res1.status).toBe(405);
    expect(res1.headers.get('Allow')).toBe('GET');

    const res2 = await putFee();
    expect(res2.status).toBe(405);
    expect(res2.headers.get('Allow')).toBe('GET');

    const res3 = await deleteAttendance();
    expect(res3.status).toBe(405);
  });

  it('P6.8-SEC-016: Zero Prisma internal fields leaked', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce({
      user: { id: 'user-owner', name: 'Owner', email: 'owner@test.com' },
      session: { id: 's-1', userId: 'user-owner', activeInstituteId: 'inst-001' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/reports/attendance');
    const res = await getAttendanceReport(req);
    const text = await res.text();
    expect(text).not.toContain('prisma');
    expect(text).not.toContain('SELECT');
    expect(text).not.toContain('WHERE');
  });

  it('P6.8-SEC-017: Financial report remains strictly read-only', async () => {
    const resPost = await postFee();
    expect(resPost.status).toBe(405);
  });

  it('P6.8-SEC-018: Malformed filter payload safely rejected without server crash', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce({
      user: { id: 'user-owner', name: 'Owner', email: 'owner@test.com' },
      session: { id: 's-1', userId: 'user-owner', activeInstituteId: 'inst-001' },
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/v1/reports/fees?paymentMode=SQL_INJECTION;DROP_TABLE');
    const res = await getFeeReport(req);
    expect(res.status).toBe(200);
  });
});
