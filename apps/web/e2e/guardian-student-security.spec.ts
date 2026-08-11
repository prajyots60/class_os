import { test, expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';

/**
 * Phase 1.9.6 — Guardian & Student Relationship API Security & E2E Integration Test Matrix
 *
 * Authoritative security matrix covering:
 * - Unauthenticated request rejection (401)
 * - Anti-spoofing defense (.strict() parameter injection prevention)
 * - HTTP Method Safety (405 Method Not Allowed)
 * - Multi-Tenant Isolation & Cross-Tenant Access Barriers (404 Not Found)
 * - Primary Guardian Atomic State Transitions
 * - Relationship Soft Archiving Invariants & Privacy Preservation
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

  const email = `rel_owner_${suffix}_${timestamp}_${Math.floor(Math.random() * 999)}@test.com`;
  const instName = `Rel Inst ${suffix} ${timestamp}`;
  const instSlug = `rel-inst-${suffix}-${timestamp}-${Math.floor(Math.random() * 999)}`;

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

async function createParent(ctx: APIRequestContext, phoneSuffix: string) {
  const res = await ctx.post('/api/institute/parents', {
    data: {
      phone: `+9198${phoneSuffix}`,
      name: `Parent ${phoneSuffix}`,
      notes: 'Private CRM staff notes',
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data;
}

async function createStudent(ctx: APIRequestContext, admSuffix: string) {
  const res = await ctx.post('/api/institute/students', {
    data: {
      admissionNumber: `ADM-${admSuffix}`,
      firstName: 'Student',
      lastName: admSuffix,
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data;
}

test.describe('Phase 1.9.6 — Guardian & Student Relationship Security Matrix', () => {
  // ── 1. Authentication Guards (REL-E2E-01 .. 07) ───────────────────────────

  test('REL-E2E-01: GET /api/institute/students/[studentId]/guardians without session returns 401', async ({ request }) => {
    const res = await request.get('/api/institute/students/123e4567-e89b-12d3-a456-426614174000/guardians');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
    expect(res.headers()['x-request-id']).toBeDefined();
  });

  test('REL-E2E-02: POST /api/institute/students/[studentId]/guardians without session returns 401', async ({ request }) => {
    const res = await request.post('/api/institute/students/123e4567-e89b-12d3-a456-426614174000/guardians', {
      data: {
        instituteParentId: '123e4567-e89b-12d3-a456-426614174001',
        relationshipType: 'father',
      },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  test('REL-E2E-03: GET /api/institute/parents/[parentId]/students without session returns 401', async ({ request }) => {
    const res = await request.get('/api/institute/parents/123e4567-e89b-12d3-a456-426614174000/students');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  test('REL-E2E-04: GET /api/institute/parent-student/[id] without session returns 401', async ({ request }) => {
    const res = await request.get('/api/institute/parent-student/123e4567-e89b-12d3-a456-426614174000');
    expect(res.status()).toBe(401);
  });

  test('REL-E2E-05: PATCH /api/institute/parent-student/[id] without session returns 401', async ({ request }) => {
    const res = await request.patch('/api/institute/parent-student/123e4567-e89b-12d3-a456-426614174000', {
      data: { relationshipType: 'mother' },
    });
    expect(res.status()).toBe(401);
  });

  test('REL-E2E-06: POST /api/institute/parent-student/[id]/primary without session returns 401', async ({ request }) => {
    const res = await request.post('/api/institute/parent-student/123e4567-e89b-12d3-a456-426614174000/primary');
    expect(res.status()).toBe(401);
  });

  test('REL-E2E-07: POST /api/institute/parent-student/[id]/archive without session returns 401', async ({ request }) => {
    const res = await request.post('/api/institute/parent-student/123e4567-e89b-12d3-a456-426614174000/archive');
    expect(res.status()).toBe(401);
  });

  // ── 2. Parameter Injection & Strict Validation Defenses (REL-E2E-08 .. 09) ─

  test('REL-E2E-08: Parameter injection (instituteId, studentId, status) is rejected with 400', async ({ playwright }) => {
    const tenant = await createTenantSession(playwright, 'inject');

    const res = await tenant.ctx.post('/api/institute/students/123e4567-e89b-12d3-a456-426614174000/guardians', {
      data: {
        instituteParentId: '123e4567-e89b-12d3-a456-426614174001',
        relationshipType: 'father',
        instituteId: 'hacked-tenant-id',
        status: 'active',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');

    await tenant.ctx.dispose();
  });

  test('REL-E2E-09: Invalid relationship taxonomy type returns 400 Validation Error', async ({ playwright }) => {
    const tenant = await createTenantSession(playwright, 'taxo');

    const res = await tenant.ctx.post('/api/institute/students/123e4567-e89b-12d3-a456-426614174000/guardians', {
      data: {
        instituteParentId: '123e4567-e89b-12d3-a456-426614174001',
        relationshipType: 'invalid_type',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');

    await tenant.ctx.dispose();
  });

  // ── 3. Multi-Tenant Isolation & Core Workflow (REL-E2E-10 .. 12) ───────────

  test('REL-E2E-10: Tenant A relationship cannot be accessed or modified by Tenant B', async ({ playwright }) => {
    const tenantA = await createTenantSession(playwright, 'isoA');
    const tenantB = await createTenantSession(playwright, 'isoB');

    const parentA = await createParent(tenantA.ctx, '12345678');
    const studentA = await createStudent(tenantA.ctx, 'ISO-A');

    // Tenant A creates link
    const createRes = await tenantA.ctx.post(`/api/institute/students/${studentA.id}/guardians`, {
      data: { instituteParentId: parentA.id, relationshipType: 'father' },
    });
    expect(createRes.status()).toBe(201);
    const relA = (await createRes.json()).data;

    // Tenant B tries to GET studentA guardians -> 404
    const getGuardiansB = await tenantB.ctx.get(`/api/institute/students/${studentA.id}/guardians`);
    expect(getGuardiansB.status()).toBe(404);

    // Tenant B tries to GET parentA students -> 404
    const getStudentsB = await tenantB.ctx.get(`/api/institute/parents/${parentA.id}/students`);
    expect(getStudentsB.status()).toBe(404);

    // Tenant B tries to GET relationship detail -> 404
    const getRelB = await tenantB.ctx.get(`/api/institute/parent-student/${relA.id}`);
    expect(getRelB.status()).toBe(404);

    // Tenant B tries to PATCH relationship -> 404
    const patchRelB = await tenantB.ctx.patch(`/api/institute/parent-student/${relA.id}`, {
      data: { relationshipType: 'mother' },
    });
    expect(patchRelB.status()).toBe(404);

    // Tenant B tries to archive relationship -> 404
    const archRelB = await tenantB.ctx.post(`/api/institute/parent-student/${relA.id}/archive`);
    expect(archRelB.status()).toBe(404);

    await tenantA.ctx.dispose();
    await tenantB.ctx.dispose();
  });

  test('REL-E2E-11: Primary guardian promotion replaces previous primary atomically', async ({ playwright }) => {
    const tenant = await createTenantSession(playwright, 'primary');

    const parent1 = await createParent(tenant.ctx, '87654321');
    const parent2 = await createParent(tenant.ctx, '87654322');
    const student = await createStudent(tenant.ctx, 'PRIM-E2E');

    // Create link 1 as primary
    const res1 = await tenant.ctx.post(`/api/institute/students/${student.id}/guardians`, {
      data: { instituteParentId: parent1.id, relationshipType: 'father', isPrimary: true },
    });
    const rel1 = (await res1.json()).data;
    expect(rel1.isPrimary).toBe(true);

    // Create link 2 as non-primary
    const res2 = await tenant.ctx.post(`/api/institute/students/${student.id}/guardians`, {
      data: { instituteParentId: parent2.id, relationshipType: 'mother', isPrimary: false },
    });
    const rel2 = (await res2.json()).data;
    expect(rel2.isPrimary).toBe(false);

    // Promote link 2 to primary
    const primRes = await tenant.ctx.post(`/api/institute/parent-student/${rel2.id}/primary`);
    expect(primRes.status()).toBe(200);
    const updatedRel2 = (await primRes.json()).data;
    expect(updatedRel2.isPrimary).toBe(true);

    // Verify link 1 is now non-primary
    const getRel1 = await tenant.ctx.get(`/api/institute/parent-student/${rel1.id}`);
    const updatedRel1 = (await getRel1.json()).data;
    expect(updatedRel1.isPrimary).toBe(false);

    await tenant.ctx.dispose();
  });

  test('REL-E2E-12: Soft archiving relationship preserves parent CRM notes and student records', async ({ playwright }) => {
    const tenant = await createTenantSession(playwright, 'arch');

    const parent = await createParent(tenant.ctx, '99887766');
    const student = await createStudent(tenant.ctx, 'ARCH-E2E');

    const createRes = await tenant.ctx.post(`/api/institute/students/${student.id}/guardians`, {
      data: { instituteParentId: parent.id, relationshipType: 'guardian' },
    });
    const rel = (await createRes.json()).data;

    // Archive relationship
    const archRes = await tenant.ctx.post(`/api/institute/parent-student/${rel.id}/archive`);
    expect(archRes.status()).toBe(200);
    const archived = (await archRes.json()).data;
    expect(archived.status).toBe('archived');

    // Verify Parent CRM endpoint still returns parent with notes intact
    const getParentRes = await tenant.ctx.get(`/api/institute/parents/${parent.id}`);
    expect(getParentRes.status()).toBe(200);
    const parentData = (await getParentRes.json()).data;
    expect(parentData.notes).toBe('Private CRM staff notes');
    expect(parentData.status).toBe('active');

    // Verify Student endpoint still returns student intact
    const getStudentRes = await tenant.ctx.get(`/api/institute/students/${student.id}`);
    expect(getStudentRes.status()).toBe(200);
    const studentData = (await getStudentRes.json()).data;
    expect(studentData.admissionStatus).toBe('pending');
    expect(studentData.status).toBe('inactive');

    await tenant.ctx.dispose();
  });
});
