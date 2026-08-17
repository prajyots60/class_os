import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getOwnerDashboard, POST as postOwnerDashboard } from './dashboard/owner/route';
import { GET as getTeacherDashboard, POST as postTeacherDashboard } from './dashboard/teacher/route';
import { AuthorizationError } from '@coaching-os/shared';
import {
  GetOwnerDashboardUseCase,
  GetAssistantDashboardUseCase,
  GetTeacherDashboardUseCase,
} from '@coaching-os/administration';

// Mock dependencies for unit-level security verification
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
            id: 'mem-owner-1',
            instituteId: 'inst-100',
            userId: 'usr-owner-1',
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
          userId: 'usr-owner-1',
          role: 'owner',
          capabilities: new Set(['institute:update', 'billing:read', 'academics:attendance:read']),
          instituteName: 'Test Apex Institute',
          instituteSlug: 'test-apex',
          membershipId: 'mem-owner-1',
        }),
      };
    }),
  };
});

vi.mock('@coaching-os/administration', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@coaching-os/administration')>();
  return {
    ...actual,
    PrismaDashboardReadRepository: vi.fn().mockImplementation(function () {
      return {
        getOwnerData: vi.fn().mockResolvedValue({
          instituteName: 'Test Apex Institute',
          timezone: 'Asia/Kolkata',
          sessionsToday: 4,
          sessionsTaken: 3,
          eligibleStudents: 100,
          presentStudents: 90,
          scheduledClassesCount: 4,
          scheduledTestsCount: 1,
          pendingFeeAmount: 50000,
          pendingInvoiceCount: 5,
          overdueStudentCount: 2,
          recentAnnouncements: [
            { id: 'ann-1', title: 'Exam Notice', publishedAt: new Date('2026-08-17T10:00:00Z'), targetScope: 'institute' },
          ],
        }),
        getTeacherData: vi.fn().mockResolvedValue({
          timezone: 'Asia/Kolkata',
          todaySessions: [],
          pendingHomework: [],
          upcomingTests: [],
        }),
        getAssistantData: vi.fn().mockResolvedValue({
          timezone: 'Asia/Kolkata',
          collectedTodayAmount: 15000,
          transactionCount: 3,
          pendingReceiptCount: 1,
          admissionsTodayCount: 2,
          pendingEnrollmentsCount: 1,
        }),
      };
    }),
  };
});

describe('Phase 6.1, 6.2 & 6.3 — Staff Dashboard Security & Adversarial Test Matrix', () => {
  describe('P6.1-SEC-001 / P6.2-SEC-001: Unauthenticated request handling', () => {
    it('should reject unauthenticated request to Owner dashboard', async () => {
      const { getAuthenticatedSession } = await import('@coaching-os/auth');
      vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost:3000/api/v1/dashboard/owner');
      const res = await getOwnerDashboard(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('P6.1-SEC-002 / P6.2-SEC-002: Tenant Isolation — Client cannot inject another instituteId', () => {
    it('should ignore client query params attempting to override instituteId', async () => {
      const { getAuthenticatedSession } = await import('@coaching-os/auth');
      vi.mocked(getAuthenticatedSession).mockResolvedValue({
        user: { id: 'usr-owner-1', email: 'owner@test.com', name: 'Owner User' },
        session: { id: 'sess-1' },
      } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

      const req = new NextRequest('http://localhost:3000/api/v1/dashboard/owner?instituteId=inst-ATTACKER');
      const res = await getOwnerDashboard(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.instituteId).toBe('inst-100');
    });
  });

  describe('P6.1-SEC-003 / P6.2-SEC-003: Role Elevation Boundary — Non-owner blocked from Owner dashboard', () => {
    it('should throw AuthorizationError if teacher attempts to access Owner dashboard', async () => {
      const useCase = new GetOwnerDashboardUseCase({
        getOwnerData: vi.fn(),
        getTeacherData: vi.fn(),
        getAssistantData: vi.fn(),
      });

      await expect(
        useCase.execute({
          instituteId: 'inst-100',
          authenticatedUserId: 'usr-teacher-1',
          userRole: 'teacher',
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('P6.1-SEC-004 / P6.2-SEC-004: Query Cache & Data Scope Isolation', () => {
    it('should reject non-assistant non-owner from Assistant dashboard', async () => {
      const useCase = new GetAssistantDashboardUseCase({
        getOwnerData: vi.fn(),
        getTeacherData: vi.fn(),
        getAssistantData: vi.fn(),
      });

      await expect(
        useCase.execute({
          instituteId: 'inst-100',
          authenticatedUserId: 'usr-parent-1',
          userRole: 'parent',
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('P6.1-SEC-005 / P6.2-SEC-005: DTO Serialization — Server DTO rendered without exposing internal fields', () => {
    it('should return plain DTO structure with zero internal Prisma metadata', async () => {
      const { getAuthenticatedSession } = await import('@coaching-os/auth');
      vi.mocked(getAuthenticatedSession).mockResolvedValue({
        user: { id: 'usr-owner-1', email: 'owner@test.com', name: 'Owner User' },
        session: { id: 'sess-1' },
      } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

      const req = new NextRequest('http://localhost:3000/api/v1/dashboard/owner');
      const res = await getOwnerDashboard(req);
      const body = await res.json();

      expect(body.success).toBe(true);
      const data = body.data;

      expect(typeof data.instituteId).toBe('string');
      expect(typeof data.attendance.sessionCompletionPercentage).toBe('number');
      expect(data).not.toHaveProperty('prisma');
      expect(data).not.toHaveProperty('password');
      expect(data).not.toHaveProperty('_count');
    });
  });

  describe('P6.1-SEC-006 / P6.2-SEC-006: Safe Unauthorized API Error Leakage Prevention', () => {
    it('should return 405 Method Not Allowed for POST requests on dashboard endpoints', async () => {
      const res = await postOwnerDashboard();
      expect(res.status).toBe(405);
      expect(res.headers.get('Allow')).toBe('GET');
    });
  });

  describe('P6.3-SEC-001..010: Teacher Dashboard Security & Boundary Invariants', () => {
    it('P6.3-SEC-001: Unauthenticated Teacher Dashboard access is rejected with 401', async () => {
      const { getAuthenticatedSession } = await import('@coaching-os/auth');
      vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost:3000/api/v1/dashboard/teacher');
      const res = await getTeacherDashboard(req);

      expect(res.status).toBe(401);
    });

    it('P6.3-SEC-002 & P6.3-SEC-003: Client cannot override instituteId or teacher/user identity via query params', async () => {
      const { getAuthenticatedSession } = await import('@coaching-os/auth');
      vi.mocked(getAuthenticatedSession).mockResolvedValue({
        user: { id: 'usr-owner-1', email: 'teacher@test.com', name: 'Teacher User' },
        session: { id: 'sess-2' },
      } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

      const req = new NextRequest('http://localhost:3000/api/v1/dashboard/teacher?instituteId=ATTACKER&userId=ATTACKER');
      const res = await getTeacherDashboard(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.instituteId).toBe('inst-100');
      expect(body.data.teacherUserId).not.toBe('ATTACKER');
      expect(body.data.teacherUserId).toBe('usr-owner-1');
    });

    it("P6.3-SEC-004: Client cannot provide an arbitrary date to change Today's Batches", async () => {
      const { getAuthenticatedSession } = await import('@coaching-os/auth');
      vi.mocked(getAuthenticatedSession).mockResolvedValue({
        user: { id: 'usr-owner-1', email: 'teacher@test.com', name: 'Teacher User' },
        session: { id: 'sess-2' },
      } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

      const req = new NextRequest('http://localhost:3000/api/v1/dashboard/teacher?date=2099-01-01');
      const res = await getTeacherDashboard(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.todayIso).not.toBe('2099-01-01');
    });

    it('P6.3-SEC-005 & P6.3-SEC-006: Teacher dashboard restricts data to teacher assignment and tenant boundary', async () => {
      const mockRepo = {
        getOwnerData: vi.fn(),
        getTeacherData: vi.fn().mockResolvedValue({
          timezone: 'Asia/Kolkata',
          todaySessions: [],
          pendingHomework: [],
          upcomingTests: [],
        }),
        getAssistantData: vi.fn(),
      };

      const useCase = new GetTeacherDashboardUseCase(mockRepo);
      const result = await useCase.execute({
        instituteId: 'inst-100',
        authenticatedUserId: 'usr-teacher-99',
        userRole: 'teacher',
      });

      expect(mockRepo.getTeacherData).toHaveBeenCalledWith(
        'inst-100',
        'usr-teacher-99',
        expect.any(String),
        expect.any(Date),
        expect.any(Date),
      );
      expect(result.teacherUserId).toBe('usr-teacher-99');
    });

    it('P6.3-SEC-007: Non-teacher non-owner user (e.g. parent) access is rejected with AuthorizationError', async () => {
      const useCase = new GetTeacherDashboardUseCase({
        getOwnerData: vi.fn(),
        getTeacherData: vi.fn(),
        getAssistantData: vi.fn(),
      });

      await expect(
        useCase.execute({
          instituteId: 'inst-100',
          authenticatedUserId: 'usr-parent-1',
          userRole: 'parent',
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('P6.3-SEC-008: No internal Prisma models or secrets are exposed in Teacher DTO response', async () => {
      const { getAuthenticatedSession } = await import('@coaching-os/auth');
      vi.mocked(getAuthenticatedSession).mockResolvedValue({
        user: { id: 'usr-owner-1', email: 'teacher@test.com', name: 'Teacher User' },
        session: { id: 'sess-2' },
      } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

      const req = new NextRequest('http://localhost:3000/api/v1/dashboard/teacher');
      const res = await getTeacherDashboard(req);
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.data).not.toHaveProperty('prisma');
      expect(body.data).not.toHaveProperty('password');
      expect(body.data).not.toHaveProperty('secret');
    });

    it('P6.3-SEC-010: HTTP POST on Teacher dashboard endpoint returns 405 Method Not Allowed', async () => {
      const res = await postTeacherDashboard();
      expect(res.status).toBe(405);
      expect(res.headers.get('Allow')).toBe('GET');
    });
  });
});
