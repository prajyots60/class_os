import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getOwnerDashboard, POST as postOwnerDashboard } from './dashboard/owner/route';
import { GET as getTeacherDashboard } from './dashboard/teacher/route';
import { GET as getAssistantDashboard } from './dashboard/assistant/route';
import { AuthenticationError, AuthorizationError } from '@coaching-os/shared';
import {
  GetOwnerDashboardUseCase,
  GetTeacherDashboardUseCase,
  GetAssistantDashboardUseCase,
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

describe('Phase 6.1 — Staff Dashboard Security & Adversarial Test Matrix', () => {
  describe('P6.1-SEC-001: Unauthenticated request handling', () => {
    it('should reject unauthenticated request to Owner dashboard', async () => {
      const { getAuthenticatedSession } = await import('@coaching-os/auth');
      vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(null as any);

      const req = new NextRequest('http://localhost:3000/api/v1/dashboard/owner');
      const res = await getOwnerDashboard(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('P6.1-SEC-002: Tenant Isolation — Client cannot inject another instituteId', () => {
    it('should ignore client query params attempting to override instituteId', async () => {
      const { getAuthenticatedSession } = await import('@coaching-os/auth');
      vi.mocked(getAuthenticatedSession).mockResolvedValue({
        user: { id: 'usr-owner-1', email: 'owner@test.com', name: 'Owner User' },
        session: { id: 'sess-1' },
      } as any);

      const req = new NextRequest('http://localhost:3000/api/v1/dashboard/owner?instituteId=inst-ATTACKER');
      const res = await getOwnerDashboard(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.instituteId).toBe('inst-100');
    });
  });

  describe('P6.1-SEC-003: Role Elevation Boundary — Client role manipulation blocked', () => {
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

  describe('P6.1-SEC-004: Assistant Dashboard Data Boundary', () => {
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

  describe('P6.1-SEC-005: Teacher Dashboard Scope Isolation', () => {
    it('should reject non-teacher non-owner from Teacher dashboard', async () => {
      const useCase = new GetTeacherDashboardUseCase({
        getOwnerData: vi.fn(),
        getTeacherData: vi.fn(),
        getAssistantData: vi.fn(),
      });

      await expect(
        useCase.execute({
          instituteId: 'inst-100',
          authenticatedUserId: 'usr-assistant-1',
          userRole: 'assistant',
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('P6.1-SEC-006: HTTP Method Safety', () => {
    it('should return 405 Method Not Allowed for POST requests on dashboard endpoints', async () => {
      const res = await postOwnerDashboard();
      expect(res.status).toBe(405);
      expect(res.headers.get('Allow')).toBe('GET');
    });
  });

  describe('P6.1-SEC-007: DTO Field Safety — No Prisma or raw internal objects leak', () => {
    it('should return plain DTO structure with zero internal Prisma metadata', async () => {
      const { getAuthenticatedSession } = await import('@coaching-os/auth');
      vi.mocked(getAuthenticatedSession).mockResolvedValue({
        user: { id: 'usr-owner-1', email: 'owner@test.com', name: 'Owner User' },
        session: { id: 'sess-1' },
      } as any);

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
});
