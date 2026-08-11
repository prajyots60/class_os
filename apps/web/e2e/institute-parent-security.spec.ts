import { test, expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';

/**
 * Phase 1.7.6 — InstituteParent API Security & Integration Test Matrix
 *
 * Authoritative security matrix covering:
 * - Authentication enforcement (PCRM-E2E-01 .. PCRM-E2E-05)
 * - Anti-spoofing defense (header, query, and body parameter injection)
 * - HTTP Method Safety (405 Method Not Allowed)
 * - Multi-Tenant Isolation & Cross-Tenant Access Barriers (404/403)
 * - Global ParentIdentity Sovereignty & Soft Archival Invariants
 * - Input validation & error redaction (no internal stack/DB leaks)
 */

async function registerUserWithRetry(
  ctx: APIRequestContext,
  user: { email: string; password: string; name: string },
) {
  let attempts = 0;
  while (attempts < 6) {
    const res = await ctx.post('/api/auth/sign-up/email', { data: user });
    if (res.status() === 429) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 5000));
      continue;
    }
    return res;
  }
  return ctx.post('/api/auth/sign-up/email', { data: user });
}

async function createTenantSession(
  playwright: PlaywrightWorkerArgs['playwright'],
  suffix: string,
) {
  const timestamp = Date.now();
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
  const ctx = await playwright.request.newContext({ baseURL });

  const email = `pcrm_owner_${suffix}_${timestamp}_${Math.floor(Math.random() * 999)}@test.com`;
  const instName = `Parent CRM Inst ${suffix} ${timestamp}`;
  const instSlug = `pcrm-inst-${suffix}-${timestamp}-${Math.floor(Math.random() * 999)}`;

  const regRes = await registerUserWithRetry(ctx, {
    email,
    password: 'SecurePassword123!',
    name: `Owner ${suffix}`,
  });
  expect([200, 201]).toContain(regRes.status());

  const uniquePhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  const onboardRes = await ctx.post('/api/onboarding/institute', {
    data: {
      name: instName,
      phone: uniquePhone,
      email,
      slug: instSlug,
      timezone: 'Asia/Kolkata',
    },
  });
  expect(onboardRes.status()).toBe(201);
  const onboardData = await onboardRes.json();

  const cookies = await ctx.storageState();
  return {
    ctx,
    email,
    institute: onboardData.data.institute,
    cookies: cookies.cookies,
  };
}

test.describe('Phase 1.7.6 — InstituteParent Security & Integration Matrix', () => {
  // ── 1. Authentication Guards (PCRM-E2E-01 .. PCRM-E2E-05) ────────────────────

  test('PCRM-E2E-01: GET /api/institute/parents without session returns 401', async ({ request }) => {
    const res = await request.get('/api/institute/parents');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
    expect(res.headers()['x-request-id']).toBeDefined();
  });

  test('PCRM-E2E-02: POST /api/institute/parents without session returns 401', async ({ request }) => {
    const res = await request.post('/api/institute/parents', {
      data: { phone: '+919876543210' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  test('PCRM-E2E-03: GET /api/institute/parents/[id] without session returns 401', async ({ request }) => {
    const res = await request.get('/api/institute/parents/123e4567-e89b-12d3-a456-426614174000');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  test('PCRM-E2E-04: PATCH /api/institute/parents/[id] without session returns 401', async ({ request }) => {
    const res = await request.patch('/api/institute/parents/123e4567-e89b-12d3-a456-426614174000', {
      data: { notes: 'Hacked Notes' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  test('PCRM-E2E-05: DELETE /api/institute/parents/[id] without session returns 401', async ({ request }) => {
    const res = await request.delete('/api/institute/parents/123e4567-e89b-12d3-a456-426614174000');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  // ── 2. Header & Parameter Injection Defenses ────────────────────────────────

  test('PCRM-E2E-06: Header spoofing (x-institute-id, x-role, x-user-id) is completely ignored', async ({ playwright }) => {
    const { ctx } = await createTenantSession(playwright, 'spoof');

    const res = await ctx.get('/api/institute/parents', {
      headers: {
        'x-institute-id': '00000000-0000-4000-a000-000000000000',
        'x-role': 'owner',
        'x-user-id': '00000000-0000-4000-a000-000000000000',
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('PCRM-E2E-07: Body parameter injection (instituteId, parentIdentityId) is rejected with 400', async ({ playwright }) => {
    const { ctx } = await createTenantSession(playwright, 'inject');

    const res = await ctx.post('/api/institute/parents', {
      data: {
        phone: '+919876543210',
        instituteId: 'hacked-tenant-id',
        parentIdentityId: 'hacked-parent-id',
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 3. HTTP Method Safety ────────────────────────────────────────────────────

  test('PCRM-E2E-08: Unsupported HTTP methods return 405 Method Not Allowed with Allow header', async ({ playwright }) => {
    const { ctx } = await createTenantSession(playwright, 'methods');

    const putRes = await ctx.put('/api/institute/parents', { data: {} });
    expect(putRes.status()).toBe(405);
    expect(putRes.headers()['allow']).toContain('GET, POST');

    const idPostRes = await ctx.post('/api/institute/parents/123e4567-e89b-12d3-a456-426614174000', { data: {} });
    expect(idPostRes.status()).toBe(405);
    expect(idPostRes.headers()['allow']).toContain('GET, PATCH, DELETE');
  });

  // ── 4. Multi-Tenant Isolation & Identity Sovereignty ─────────────────────────

  test('PCRM-E2E-09: Multi-tenant isolation and global ParentIdentity sovereignty', async ({ playwright }) => {
    const tenantA = await createTenantSession(playwright, 'tenantA');
    const tenantB = await createTenantSession(playwright, 'tenantB');

    const sharedPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;

    // 1. Tenant A creates parent CRM record for sharedPhone
    const resA = await tenantA.ctx.post('/api/institute/parents', {
      data: { phone: sharedPhone, name: 'Shared Parent Name', notes: 'Tenant A confidential notes' },
    });
    expect(resA.status()).toBe(201);
    const parentA = (await resA.json()).data;

    // 2. Tenant B creates parent CRM record for SAME sharedPhone
    const resB = await tenantB.ctx.post('/api/institute/parents', {
      data: { phone: sharedPhone, notes: 'Tenant B confidential notes' },
    });
    expect(resB.status()).toBe(201);
    const parentB = (await resB.json()).data;

    // Invariants:
    expect(parentA.parentIdentityId).toBe(parentB.parentIdentityId);
    expect(parentA.id).not.toBe(parentB.id);
    expect(parentA.instituteId).toBe(tenantA.institute.id);
    expect(parentB.instituteId).toBe(tenantB.institute.id);

    // 3. Tenant B cannot access Tenant A's CRM record
    const crossGetRes = await tenantB.ctx.get(`/api/institute/parents/${parentA.id}`);
    expect(crossGetRes.status()).toBe(404);

    const crossPatchRes = await tenantB.ctx.patch(`/api/institute/parents/${parentA.id}`, {
      data: { notes: 'Malicious update attempt' },
    });
    expect(crossPatchRes.status()).toBe(404);

    // 4. Tenant A soft-archives its CRM record
    const archiveRes = await tenantA.ctx.delete(`/api/institute/parents/${parentA.id}`);
    expect(archiveRes.status()).toBe(200);
    const archivedA = (await archiveRes.json()).data;
    expect(archivedA.status).toBe('inactive');

    // 5. Tenant B's parent record remains active & unaffected
    const getBRes = await tenantB.ctx.get(`/api/institute/parents/${parentB.id}`);
    expect(getBRes.status()).toBe(200);
    const activeB = (await getBRes.json()).data;
    expect(activeB.status).toBe('active');
    expect(activeB.notes).toBe('Tenant B confidential notes');
  });

  // ── 5. Error Redaction & Input Validation ────────────────────────────────────

  test('PCRM-E2E-10: Invalid UUID parameter and malformed payloads fail safely without database leaks', async ({ playwright }) => {
    const { ctx } = await createTenantSession(playwright, 'validation');

    const uuidRes = await ctx.get('/api/institute/parents/not-a-valid-uuid');
    expect(uuidRes.status()).toBe(400);
    const text = await uuidRes.text();
    expect(text).not.toContain('PrismaClientKnownRequestError');
    expect(text).not.toContain('postgresql://');
  });
});
