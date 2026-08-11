/**
 * auth-guards.test.ts
 *
 * Unit tests for server-side session and tenant-context guards.
 *
 * Mocking strategy:
 * - next/headers → mocked to return a deterministic Headers object
 * - next/navigation → mocked to capture redirect() calls as thrown errors
 * - @coaching-os/auth → mocked to control session state
 * - @coaching-os/identity use cases → mocked to control membership/tenant state
 *
 * These tests validate the guard DECISION LOGIC without touching the database.
 * The domain use-cases themselves have separate integration tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

// next/headers mock — returns an empty Headers object by default
vi.mock('next/headers', () => ({
  headers: vi.fn(() => new Headers()),
}));

// next/navigation mock — redirect() throws so we can assert on it
const mockRedirect = vi.fn((url: string): never => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
}));

// @coaching-os/auth mock
const mockGetAuthenticatedSession = vi.fn();
vi.mock('@coaching-os/auth', () => ({
  getAuthenticatedSession: (...args: unknown[]) => mockGetAuthenticatedSession(...args),
}));

// @coaching-os/identity mock
const mockGetUserMembershipsExecute = vi.fn();
const mockResolveMembershipExecute = vi.fn();
const mockInstituteRepoFindById = vi.fn();

vi.mock('@coaching-os/identity', () => {
  // Classes must be real constructor functions for `new` to work
  function MockPrismaInstituteMembershipRepository() {}
  function MockPrismaInstituteRepository(this: { findById: typeof mockInstituteRepoFindById }) {
    this.findById = mockInstituteRepoFindById;
  }
  function MockGetUserMembershipsUseCase() {}
  MockGetUserMembershipsUseCase.prototype.execute = (...args: unknown[]) =>
    mockGetUserMembershipsExecute(...args);
  function MockResolveInstituteMembershipUseCase() {}
  MockResolveInstituteMembershipUseCase.prototype.execute = (...args: unknown[]) =>
    mockResolveMembershipExecute(...args);

  return {
    GetUserMembershipsUseCase: MockGetUserMembershipsUseCase,
    ResolveInstituteMembershipUseCase: MockResolveInstituteMembershipUseCase,
    PrismaInstituteMembershipRepository: MockPrismaInstituteMembershipRepository,
    PrismaInstituteRepository: MockPrismaInstituteRepository,
  };
});

// ── Import after mocks are set up ────────────────────────────────────────────

import { requireAuthSession, resolveServerTenantContext } from './auth-guards';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_SESSION = {
  user: { id: 'user-123', name: 'Test User', email: 'test@test.com' },
  session: { id: 'session-abc' },
};

const MOCK_MEMBERSHIP_ENTITY = {
  id: 'mem-1',
  userId: 'user-123',
  instituteId: 'inst-1',
  isActive: true,
  role: 'owner',
  status: 'active',
};

const MOCK_TENANT_CONTEXT = {
  userId: 'user-123',
  instituteId: 'inst-1',
  membershipId: 'mem-1',
  role: 'owner' as const,
  status: 'active' as const,
};

const MOCK_INSTITUTE = {
  name: 'Test Physics Academy',
  slug: 'test-physics',
  status: 'active',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('requireAuthSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the session when a valid session exists', async () => {
    mockGetAuthenticatedSession.mockResolvedValue(MOCK_SESSION);

    const session = await requireAuthSession('/dashboard');

    expect(session).toEqual(MOCK_SESSION);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects to /sign-in?callbackUrl=%2Fdashboard when no session exists', async () => {
    mockGetAuthenticatedSession.mockResolvedValue(null);

    await expect(requireAuthSession('/dashboard')).rejects.toThrow(
      'REDIRECT:/sign-in?callbackUrl=%2Fdashboard',
    );
  });

  it('redirects to /sign-in?callbackUrl=%2Fonboarding when no session on /onboarding', async () => {
    mockGetAuthenticatedSession.mockResolvedValue(null);

    await expect(requireAuthSession('/onboarding')).rejects.toThrow(
      'REDIRECT:/sign-in?callbackUrl=%2Fonboarding',
    );
  });

  it('redirects to /sign-in (no callbackUrl) when callbackPath is invalid/external', async () => {
    mockGetAuthenticatedSession.mockResolvedValue(null);

    // An external path should be sanitized to null → fallback to /sign-in
    await expect(requireAuthSession('https://evil.com')).rejects.toThrow(
      'REDIRECT:/sign-in',
    );
  });

  it('redirects to /sign-in (no callbackUrl) when session has user=null', async () => {
    mockGetAuthenticatedSession.mockResolvedValue({ user: null, session: {} });

    await expect(requireAuthSession('/dashboard')).rejects.toThrow(
      'REDIRECT:/sign-in?callbackUrl=%2Fdashboard',
    );
  });
});

describe('resolveServerTenantContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns hasTenant:false when user has no active memberships', async () => {
    mockGetUserMembershipsExecute.mockResolvedValue([]);

    const result = await resolveServerTenantContext('user-123');

    expect(result.hasTenant).toBe(false);
    expect(mockResolveMembershipExecute).not.toHaveBeenCalled();
  });

  it('returns hasTenant:true with full TenantContext when membership exists', async () => {
    mockGetUserMembershipsExecute.mockResolvedValue([MOCK_MEMBERSHIP_ENTITY]);
    mockResolveMembershipExecute.mockResolvedValue(MOCK_TENANT_CONTEXT);
    mockInstituteRepoFindById.mockResolvedValue(MOCK_INSTITUTE);

    const result = await resolveServerTenantContext('user-123');

    expect(result.hasTenant).toBe(true);
    if (!result.hasTenant) throw new Error('Expected hasTenant:true');

    expect(result.tenantContext.userId).toBe('user-123');
    expect(result.tenantContext.instituteId).toBe('inst-1');
    expect(result.tenantContext.role).toBe('owner');
    expect(result.tenantContext.status).toBe('active');
    expect(result.institute?.name).toBe('Test Physics Academy');
    expect(result.institute?.slug).toBe('test-physics');
  });

  it('returns hasTenant:true with institute:null when institute record is not found', async () => {
    mockGetUserMembershipsExecute.mockResolvedValue([MOCK_MEMBERSHIP_ENTITY]);
    mockResolveMembershipExecute.mockResolvedValue(MOCK_TENANT_CONTEXT);
    mockInstituteRepoFindById.mockResolvedValue(null);

    const result = await resolveServerTenantContext('user-123');

    expect(result.hasTenant).toBe(true);
    if (!result.hasTenant) throw new Error('Expected hasTenant:true');
    expect(result.institute).toBeNull();
  });

  it('resolves membership using userId from session (not from any request param)', async () => {
    mockGetUserMembershipsExecute.mockResolvedValue([MOCK_MEMBERSHIP_ENTITY]);
    mockResolveMembershipExecute.mockResolvedValue(MOCK_TENANT_CONTEXT);
    mockInstituteRepoFindById.mockResolvedValue(MOCK_INSTITUTE);

    await resolveServerTenantContext('user-123');

    // SECURITY: GetUserMembershipsUseCase must be called with the trusted userId
    expect(mockGetUserMembershipsExecute).toHaveBeenCalledWith({
      userId: 'user-123',
      authenticatedUserId: 'user-123',
      activeOnly: true,
    });

    // SECURITY: ResolveInstituteMembershipUseCase must use the membership's instituteId
    expect(mockResolveMembershipExecute).toHaveBeenCalledWith({
      userId: 'user-123',
      requestedInstituteId: MOCK_MEMBERSHIP_ENTITY.instituteId,
    });
  });
});
