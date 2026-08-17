import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, POST, PUT, DELETE } from './route';
import { getAuthenticatedSession } from '@coaching-os/auth';

vi.mock('@coaching-os/auth', () => ({
  getAuthenticatedSession: vi.fn(),
  auth: {
    api: {},
  },
}));

vi.mock('@coaching-os/identity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@coaching-os/identity')>();
  return {
    ...actual,
    PrismaInstituteMembershipRepository: class {
      constructor() {}
    },
    PrismaInstituteRepository: class {
      constructor() {}
    },
    GetUserMembershipsUseCase: class {
      execute = vi.fn().mockResolvedValue([
        {
          id: 'mem-001',
          instituteId: 'inst-001',
          role: 'owner',
          status: 'active',
        },
      ]);
    },
    ResolveInstituteMembershipUseCase: class {
      execute = vi.fn().mockResolvedValue({
        userId: 'user-001',
        instituteId: 'inst-001',
        role: 'owner',
        capabilities: ['settings:read', 'settings:update'],
      });
    },
    GetInstituteSettingsUseCase: class {
      execute = vi.fn().mockResolvedValue({
        id: 'inst-001',
        name: 'Alpha Coaching Classes',
        slug: 'alpha-coaching',
        phone: '+919876543210',
        email: 'contact@alphacoaching.com',
        logoUrl: 'https://cdn.example.com/logo.png',
        primaryColor: '#0F172A',
        timezone: 'Asia/Kolkata',
        status: 'active',
      });
    },
    UpdateInstituteSettingsUseCase: class {
      execute = vi.fn().mockResolvedValue({
        id: 'inst-001',
        name: 'Updated Institute Name',
        slug: 'alpha-coaching',
        phone: '+919876543210',
        email: 'contact@alphacoaching.com',
        logoUrl: 'https://cdn.example.com/logo.png',
        primaryColor: '#2563EB',
        timezone: 'Asia/Kolkata',
        status: 'active',
      });
    },
  };
});

describe('Phase 6.9 — Settings Security & Authorization Matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validSession = {
    user: { id: 'user-001', name: 'Owner', email: 'owner@test.com' },
    session: { id: 's-1', userId: 'user-001', activeInstituteId: 'inst-001' },
  };

  it('SETTINGS-6.9-SEC-001: Unauthenticated GET settings rejected with 401', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost:3000/api/institute/settings', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe('UNAUTHENTICATED');
  });

  it('SETTINGS-6.9-SEC-002: Unauthenticated PATCH settings rejected with 401', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost:3000/api/institute/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked Name' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it('SETTINGS-6.9-SEC-003: Client instituteId query parameter override is ignored', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(validSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest(
      'http://localhost:3000/api/institute/settings?instituteId=inst-ATTACKER',
      { method: 'GET', headers: { cookie: 'better-auth.session_token=test' } }
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe('inst-001');
    expect(json.data.id).not.toBe('inst-ATTACKER');
  });

  it('SETTINGS-6.9-SEC-004: Injected client headers (x-institute-id, x-role) are ignored', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(validSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/institute/settings', {
      method: 'GET',
      headers: {
        cookie: 'better-auth.session_token=test',
        'x-institute-id': 'hacked_inst',
        'x-role': 'superadmin',
      },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe('inst-001');
  });

  it('SETTINGS-6.9-SEC-005: Rejects empty PATCH object {} with 400 VALIDATION_ERROR', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(validSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/institute/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', cookie: 'better-auth.session_token=test' },
      body: JSON.stringify({}),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it('SETTINGS-6.9-SEC-006: Rejects malformed JSON body with 400 VALIDATION_ERROR', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(validSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/institute/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', cookie: 'better-auth.session_token=test' },
      body: '{ malformed json...',
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it('SETTINGS-6.9-SEC-007: Rejects attempts to pass protected identity fields (id, slug, status, role)', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(validSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const attackPayloads = [
      { id: 'hacked_id' },
      { slug: 'hacked-slug' },
      { status: 'archived' },
      { role: 'superadmin' },
      { instituteId: 'foreign_institute' },
    ];

    for (const payload of attackPayloads) {
      const req = new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', cookie: 'better-auth.session_token=test' },
        body: JSON.stringify({ name: 'Valid Name', ...payload }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(400);
    }
  });

  it('SETTINGS-6.9-SEC-008: Rejects non-HTTPS logo URLs (http, javascript:, file:)', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(validSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const invalidUrls = [
      'http://cdn.example.com/logo.png',
      'javascript:alert(1)',
      'file:///etc/passwd',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    ];

    for (const logoUrl of invalidUrls) {
      const req = new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', cookie: 'better-auth.session_token=test' },
        body: JSON.stringify({ logoUrl }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(400);
    }
  });

  it('SETTINGS-6.9-SEC-009: Rejects invalid HEX primary colors (RGB, HSL, CSS vars, invalid strings)', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(validSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const invalidColors = ['rgb(255, 0, 0)', 'hsl(0, 100%, 50%)', 'var(--primary)', 'red', '#12345', '#GGGGGG'];

    for (const primaryColor of invalidColors) {
      const req = new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', cookie: 'better-auth.session_token=test' },
        body: JSON.stringify({ primaryColor }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(400);
    }
  });

  it('SETTINGS-6.9-SEC-010: Unsupported HTTP methods return 405 Method Not Allowed', async () => {
    const resPost = await POST();
    expect(resPost.status).toBe(405);
    expect(resPost.headers.get('Allow')).toBe('GET, PATCH');

    const resPut = await PUT();
    expect(resPut.status).toBe(405);

    const resDelete = await DELETE();
    expect(resDelete.status).toBe(405);
  });

  it('SETTINGS-6.9-SEC-011: Response headers contain x-request-id and no-store cache control', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(validSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/institute/settings', {
      method: 'GET',
      headers: { cookie: 'better-auth.session_token=test' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBeDefined();
    expect(res.headers.get('Cache-Control')).toBe('no-store, max-age=0');
  });

  it('SETTINGS-6.9-SEC-012: Successful PATCH returns updated settings DTO', async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(validSession as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const req = new NextRequest('http://localhost:3000/api/institute/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', cookie: 'better-auth.session_token=test' },
      body: JSON.stringify({ name: 'Updated Institute Name', primaryColor: '#2563EB' }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Updated Institute Name');
    expect(json.data.primaryColor).toBe('#2563EB');
  });
});
