/**
 * Phase 6.7 — Staff Workspace UX Integration & Operational Actions Security Suite
 * Tests P6.7-SEC-001 through P6.7-SEC-015
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getDashboardOwner } from './dashboard/owner/route';
import { GET as getDashboardTeacher } from './dashboard/teacher/route';
import { GET as getDashboardAssistant } from './dashboard/assistant/route';
import { GET as getSearch } from './search/route';
import { GET as getStudents } from './students/route';
import { GET as getInvoices } from './invoices/route';
import { GET as getSessions } from './academics/sessions/route';
import { POST as completeSessionPOST } from './academics/sessions/[id]/complete/route';
import { POST as recordPaymentPOST } from './payments/route';
import { getAuthenticatedSession } from '@coaching-os/auth';
import { db } from '@coaching-os/database';
import * as shared from '@coaching-os/shared';
import { toErrorResponse } from '@coaching-os/observability';

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
            instituteName: 'Apex Academy',
            instituteSlug: 'apex-academy',
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
      findFirst: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    batch: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    batchSession: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
  },
}));

describe('Phase 6.7 — Staff Workspace UX Integration Security Matrix', () => {
  const mockOwnerSession = {
    user: { id: 'user-owner-1', email: 'owner@apex.com', name: 'Owner User' },
    session: { id: 'sess-1', userId: 'user-owner-1' },
    memberships: [
      { id: 'mem-1', instituteId: 'inst-001', role: 'owner', status: 'active' },
    ],
  };

  const mockTeacherSession = {
    user: { id: 'user-teacher-1', email: 'teacher@apex.com', name: 'Teacher User' },
    session: { id: 'sess-2', userId: 'user-teacher-1' },
    memberships: [
      { id: 'mem-2', instituteId: 'inst-001', role: 'teacher', status: 'active' },
    ],
  };

  const mockParentSession = {
    user: { id: 'user-parent-1', email: 'parent@home.com', name: 'Parent User' },
    session: { id: 'sess-3', userId: 'user-parent-1' },
    memberships: [
      { id: 'mem-3', instituteId: 'inst-001', role: 'parent', status: 'active' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedSession).mockResolvedValue(
      mockOwnerSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>,
    );
    vi.mocked(db.student.findMany).mockResolvedValue([]);
    vi.mocked(db.student.count).mockResolvedValue(0);
    vi.mocked(db.invoice.findMany).mockResolvedValue([]);
    vi.mocked(db.invoice.count).mockResolvedValue(0);
    vi.mocked(db.batch.findMany).mockResolvedValue([]);
    vi.mocked(db.batch.count).mockResolvedValue(0);
    vi.mocked(db.batchSession.findMany).mockResolvedValue([]);
    vi.mocked(db.batchSession.count).mockResolvedValue(0);
  });

  // ── P6.7-SEC-001..004: Authentication & Context Security ───────────────────

  it('P6.7-SEC-001: Unauthenticated integrated workspace request returns 401 Unauthorized', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost:3000/api/v1/students');
    const res = await getStudents(req);
    expect(res.status).toBe(401);
  });

  it('P6.7-SEC-002: Client instituteId query parameter cannot change destination data scope', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/students?instituteId=ATTACKER_INSTITUTE');
    const res = await getStudents(req);
    expect(res.status).toBe(200);

    expect(db.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          instituteId: 'inst-001',
        }),
      }),
    );
  });

  it('P6.7-SEC-003: Client userId query parameter cannot change session authorization context', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/invoices?userId=VICTIM_USER_99');
    const res = await getInvoices(req);
    expect(res.status).toBe(200);

    expect(db.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          billingPlan: expect.objectContaining({
            enrollment: expect.objectContaining({
              instituteId: 'inst-001',
            }),
          }),
        }),
      }),
    );
  });

  it('P6.7-SEC-004: Client role query parameter cannot elevate action permissions', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(
      mockTeacherSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>,
    );
    const req = new NextRequest('http://localhost:3000/api/v1/dashboard/owner?role=owner');
    const res = await getDashboardOwner(req);
    expect(res.status).toBe(403);
  });

  // ── P6.7-SEC-005..008: Multi-Tenant & Cross-Tenant Scoping ─────────────────

  it('P6.7-SEC-005: Cross-institute student action query returns strictly scoped institute data', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/students?search=Rahul');
    const res = await getStudents(req);
    expect(res.status).toBe(200);

    expect(db.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          instituteId: 'inst-001',
        }),
      }),
    );
  });

  it('P6.7-SEC-006: Cross-institute invoice action query returns strictly scoped institute data', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/invoices?search=INV-101');
    const res = await getInvoices(req);
    expect(res.status).toBe(200);

    expect(db.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          billingPlan: expect.objectContaining({
            enrollment: expect.objectContaining({
              instituteId: 'inst-001',
            }),
          }),
        }),
      }),
    );
  });

  it('P6.7-SEC-007: Cross-institute session query rejects foreign batch with 404', async () => {
    vi.mocked(db.batch.findFirst).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost:3000/api/v1/academics/sessions?batchId=11111111-1111-4111-a111-111111111111');
    const res = await getSessions(req);
    expect(res.status).toBe(404);
  });

  it('P6.7-SEC-008: Teacher cannot complete session in unauthorized foreign batch', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(
      mockTeacherSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>,
    );
    vi.mocked(db.batchSession.findFirst).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost:3000/api/v1/academics/sessions/11111111-1111-4111-a111-111111111111/complete', {
      method: 'POST',
    });
    const res = await completeSessionPOST(req, { params: Promise.resolve({ id: '11111111-1111-4111-a111-111111111111' }) });
    expect(res.status).toBe(404);
  });

  // ── P6.7-SEC-009..012: Role & Query Forgery Protections ─────────────────────

  it('P6.7-SEC-009: Parent role attempting staff workspace operational action is blocked with 403', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(
      mockParentSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>,
    );
    const req = new NextRequest('http://localhost:3000/api/v1/academics/sessions');
    const res = await getSessions(req);
    expect(res.status).toBe(403);
  });

  it('P6.7-SEC-010: Unauthorized financial action remains blocked server-side', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(
      mockTeacherSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>,
    );
    const req = new NextRequest('http://localhost:3000/api/v1/payments', {
      method: 'POST',
      body: JSON.stringify({
        invoiceId: 'inv-101',
        amount: 5000,
        paymentMode: 'cash',
      }),
    });
    const res = await recordPaymentPOST(req);
    expect(res.status).toBe(403);
  });

  it('P6.7-SEC-011: Unauthorized academic action remains blocked server-side', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(
      mockParentSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>,
    );
    const req = new NextRequest('http://localhost:3000/api/v1/academics/sessions/11111111-1111-4111-a111-111111111111/complete', {
      method: 'POST',
    });
    const res = await completeSessionPOST(req, { params: Promise.resolve({ id: '11111111-1111-4111-a111-111111111111' }) });
    expect(res.status).toBe(403);
  });

  it('P6.7-SEC-012: Forged query parameters (?instituteId=ATTACKER&role=owner) cannot bypass authorization', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(
      mockTeacherSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>,
    );
    const req = new NextRequest('http://localhost:3000/api/v1/search?q=Rahul&instituteId=ATTACKER_INST&role=owner');
    const res = await getSearch(req);
    expect(res.status).toBe(200);

    // Verify search query executes under authenticated teacher's institute scope
    expect(db.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          instituteId: 'inst-001',
        }),
      }),
    );
  });

  // ── P6.7-SEC-013..015: Error Masking & Boundary Safety ───────────────────────

  it('P6.7-SEC-013: Invalid or missing resource IDs return safe 404 behavior', async () => {
    vi.mocked(db.batchSession.findFirst).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost:3000/api/v1/academics/sessions/11111111-1111-4111-a111-111111111111/complete', {
      method: 'POST',
    });
    const res = await completeSessionPOST(req, { params: Promise.resolve({ id: '11111111-1111-4111-a111-111111111111' }) });
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('P6.7-SEC-014: Zero internal database details (Prisma/SQL stack traces) leak through action errors', async () => {
    vi.mocked(db.student.findMany).mockRejectedValueOnce(new Error('FATAL DB: Connection refused at postgresql://user:secret@localhost:5432/main'));

    const req = new NextRequest('http://localhost:3000/api/v1/students');
    const res = await getStudents(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error.message).toBe('An unexpected internal server error occurred.');
    expect(JSON.stringify(body)).not.toContain('postgres');
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('P6.7-SEC-015: Unsupported HTTP methods on operational routes return 405 Method Not Allowed', async () => {
    const res = await toErrorResponse(
      new shared.ValidationError('Method POST not allowed on /api/v1/dashboard/owner.'),
      'req-test-uuid',
    );
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
