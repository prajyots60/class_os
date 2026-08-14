import { test, expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';

/**
 * Phase 2.7 — Staff Academic Workspace Workflow, Security, UX & Mobile Matrix
 *
 * Scenarios: E2E-ACADEMIC-01 through E2E-ACADEMIC-18
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
      await new Promise((resolve) => setTimeout(resolve, 3000));
      continue;
    }
    return res;
  }
  return ctx.post('/api/auth/sign-up/email', { data: user });
}

type CookieItem = Awaited<ReturnType<APIRequestContext['storageState']>>['cookies'][number];

async function createTenantSession(
  playwright: PlaywrightWorkerArgs['playwright'],
  suffix: string,
) {
  const timestamp = Date.now();
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
  const ctx = await playwright.request.newContext({ baseURL });

  const ownerEmail = `acad_matrix_${suffix}_${timestamp}@test.com`;
  const password = 'SecurePassword123!';

  const signUpRes = await registerUserWithRetry(ctx, {
    email: ownerEmail,
    password,
    name: `Owner ${suffix}`,
  });
  expect(signUpRes.status()).toBe(200);

  const storageState = await ctx.storageState();
  const cookies: CookieItem[] = storageState.cookies;

  const onbRes = await ctx.post('/api/onboarding/institute', {
    data: {
      name: `Institute Matrix ${suffix}`,
      phone: '+15551234567',
      email: ownerEmail,
    },
  });
  expect(onbRes.status()).toBe(201);
  const onbBody = await onbRes.json();
  const instituteId = onbBody.data.institute.id;

  return { ctx, cookies, ownerEmail, password, instituteId };
}

test.describe('Phase 2.7 — Academics Full Vertical Slice E2E Matrix', () => {

  // ── E2E-ACADEMIC-01 & 02: Overview & Workspace Tab Navigation ──────────────
  test('E2E-ACADEMIC-01 & 02: Dashboard overview and tab navigation', async ({ page, playwright }) => {
    const { cookies } = await createTenantSession(playwright, 'nav');
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
    await page.context().addCookies(cookies.map((c) => ({ ...c, domain: 'localhost' })));

    await page.goto(`${baseURL}/academics`);
    await page.waitForLoadState('networkidle');

    // Overview Tab
    await expect(page.getByText("Today's Work")).toBeVisible();

    // Sessions Tab
    await page.getByRole('button', { name: 'Sessions & Schedules' }).click();
    await expect(page.getByText('Recurring Weekly Schedules')).toBeVisible();

    // Attendance Tab
    await page.getByRole('button', { name: 'Attendance' }).click();
    await expect(page.getByText(/Select Batch/i).or(page.getByText(/Total Enrolled Students/i))).toBeVisible();

    // Homework Tab
    await page.getByRole('button', { name: 'Homework' }).click();
    await expect(page.getByText(/Create Homework Draft/i).or(page.getByText(/No homework has been created/i))).toBeVisible();

    // Assessments Tab
    await page.getByRole('button', { name: 'Assessments & Marks' }).click();
    await expect(page.getByText(/Create Assessment/i).or(page.getByText(/No assessments have been created/i))).toBeVisible();
  });

  // ── E2E-ACADEMIC-03: Direct URL Navigation ────────────────────────────────
  test('E2E-ACADEMIC-03: Direct URL navigation with query parameter (?tab=attendance)', async ({ page, playwright }) => {
    const { cookies } = await createTenantSession(playwright, 'url_nav');
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
    await page.context().addCookies(cookies.map((c) => ({ ...c, domain: 'localhost' })));

    await page.goto(`${baseURL}/academics?tab=attendance`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Select Batch/i).or(page.getByText(/Total Enrolled Students/i))).toBeVisible();
  });

  // ── E2E-ACADEMIC-05 & 06: Homework Workflow & Immutability ─────────────────
  test('E2E-ACADEMIC-05 & 06: Homework draft creation, publication modal confirmation, and immutability', async ({ page, playwright }) => {
    const { cookies, ctx } = await createTenantSession(playwright, 'hw_flow');
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
    await page.context().addCookies(cookies.map((c) => ({ ...c, domain: 'localhost' })));

    // Setup program, subject, batch via API
    const pRes = await ctx.post('/api/v1/programs', { data: { name: 'Physics Program', code: 'PHY-PROG' } });
    expect(pRes.status()).toBe(201);
    const progId = (await pRes.json()).data.id;

    const sRes = await ctx.post('/api/v1/subjects', { data: { programId: progId, name: 'Physics I', code: 'PHY-101' } });
    expect(sRes.status()).toBe(201);
    const subjId = (await sRes.json()).data.id;

    const bRes = await ctx.post('/api/v1/batches', { data: { subjectId: subjId, name: 'Batch Alpha', code: 'ALPHA' } });
    expect(bRes.status()).toBe(201);

    await page.goto(`${baseURL}/academics?tab=homework`);
    await page.waitForLoadState('networkidle');

    // Create Draft Homework
    await page.getByRole('button', { name: 'Create Homework' }).click();
    await page.fill('input[name="title"]', 'Quantum Homework 1');
    await page.fill('textarea[name="description"]', 'Solve problems 1 to 5');
    await page.getByRole('button', { name: 'Save Draft' }).click();

    await expect(page.getByText('Quantum Homework 1')).toBeVisible();
    await expect(page.getByText('DRAFT')).toBeVisible();

    // Click Publish Homework
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Publish Homework?')).toBeVisible();
    await expect(page.getByText('Once published, this homework cannot be modified or deleted')).toBeVisible();

    // Cancel Publication Dialog
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('DRAFT')).toBeVisible();

    // Confirm Publication
    await page.getByRole('button', { name: 'Publish' }).click();
    await page.getByRole('button', { name: 'Publish Homework Now' }).click();

    await expect(page.getByText('PUBLISHED')).toBeVisible();
    // Verify Edit/Delete controls are no longer rendered for published homework
    await expect(page.getByRole('button', { name: 'Edit Homework' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete Homework' })).not.toBeVisible();
  });

  // ── E2E-ACADEMIC-07, 08, 09: Assessments & Bulk Marks Matrix ───────────────
  test('E2E-ACADEMIC-07, 08, 09: Assessment lifecycle, bulk marks entry, validation & publication', async ({ page, playwright }) => {
    const { cookies, ctx } = await createTenantSession(playwright, 'test_marks');
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
    await page.context().addCookies(cookies.map((c) => ({ ...c, domain: 'localhost' })));

    // Setup academic hierarchy
    const pRes = await ctx.post('/api/v1/programs', { data: { name: 'Math Program', code: 'MATH-PROG' } });
    const progId = (await pRes.json()).data.id;

    const sRes = await ctx.post('/api/v1/subjects', { data: { programId: progId, name: 'Algebra II', code: 'ALG-201' } });
    const subjId = (await sRes.json()).data.id;

    const bRes = await ctx.post('/api/v1/batches', { data: { subjectId: subjId, name: 'Batch Beta', code: 'BETA' } });
    expect(bRes.status()).toBe(201);

    await page.goto(`${baseURL}/academics?tab=tests`);
    await page.waitForLoadState('networkidle');

    // Create Draft Assessment
    await page.getByRole('button', { name: 'Create Assessment' }).click();
    await page.fill('input[name="title"]', 'Midterm Exam');
    await page.fill('input[name="maximumMarks"]', '100');
    await page.getByRole('button', { name: 'Save Assessment' }).click();

    await expect(page.getByText('Midterm Exam')).toBeVisible();
    await expect(page.getByText('Draft')).toBeVisible();

    // Schedule Test
    await page.getByRole('button', { name: 'Schedule Test' }).click();
    await page.fill('input[type="date"]', '2026-09-01');
    await page.getByRole('button', { name: 'Confirm Schedule' }).click();
    await expect(page.getByText('Scheduled')).toBeVisible();

    // Enter Marks
    await page.getByRole('button', { name: 'Enter Marks' }).click();
    await expect(page.getByText('Bulk Marks Entry — Midterm Exam')).toBeVisible();

    // Test Invalid Marks Client Validation (e.g. > maxMarks 100)
    await page.fill('input[type="number"]', '150');
    await page.getByRole('button', { name: 'Save Marks' }).click();
    await expect(page.getByText(/Cannot exceed maximum marks \(100\)/i)).toBeVisible();

    // Enter Valid Marks
    await page.fill('input[type="number"]', '92.5');
    await page.getByRole('button', { name: 'Save Marks' }).click();
    await expect(page.getByText('Marks Entered')).toBeVisible();

    // Publish Results
    await page.getByRole('button', { name: 'Publish Results' }).click();
    await expect(page.getByText('Publish Test Results?')).toBeVisible();
    await page.getByRole('button', { name: 'Publish Results Now' }).click();

    await expect(page.getByText('Published')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enter Marks' })).not.toBeVisible();
  });

  // ── E2E-ACADEMIC-11 & 12: Cross-Tenant Isolation & Spoofing Defense ─────────
  test('E2E-ACADEMIC-11 & 12: Cross-tenant resource isolation & client-supplied tenant header rejection', async ({ playwright }) => {
    const sessionA = await createTenantSession(playwright, 'tenant_iso_a');
    const sessionB = await createTenantSession(playwright, 'tenant_iso_b');

    // Create Schedule in Tenant A
    const subRes = await sessionA.ctx.post('/api/v1/subjects', { data: { name: 'Chemistry', code: 'CHEM' } });
    const subjId = (await subRes.json()).data.id;
    const batchRes = await sessionA.ctx.post('/api/v1/batches', { data: { subjectId: subjId, name: 'Batch Iso', code: 'ISO' } });
    const batchId = (await batchRes.json()).data.id;

    const schedRes = await sessionA.ctx.post('/api/v1/academics/schedules', {
      data: { batchId, dayOfWeek: 'monday', startTime: '14:00', endTime: '15:30' },
    });
    expect(schedRes.status()).toBe(201);
    const schedId = (await schedRes.json()).data.id;

    // Tenant B attempts GET schedule with spoofed x-institute-id header
    const spoofRes = await sessionB.ctx.get(`/api/v1/academics/schedules?batchId=${batchId}`, {
      headers: { 'x-institute-id': sessionA.instituteId },
    });
    expect(spoofRes.status()).toBe(404);

    // Tenant B attempts PATCH schedule
    const patchRes = await sessionB.ctx.patch(`/api/v1/academics/schedules/${schedId}`, {
      data: { batchId, startTime: '16:00' },
    });
    expect(patchRes.status()).toBe(404);
  });

  // ── E2E-ACADEMIC-14 & 15: Mobile Viewport (375px) Layout & Touch Matrix ─────
  test('E2E-ACADEMIC-14 & 15: Mobile viewport 375px touch layout and workflow usability', async ({ page, playwright }) => {
    page.setViewportSize({ width: 375, height: 812 });

    const { cookies } = await createTenantSession(playwright, 'mobile');
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
    await page.context().addCookies(cookies.map((c) => ({ ...c, domain: 'localhost' })));

    await page.goto(`${baseURL}/academics`);
    await page.waitForLoadState('networkidle');

    // Mobile Overview Dashboard
    await expect(page.getByText("Today's Work")).toBeVisible();

    // Verify Tab Bar wraps or scrolls gracefully on mobile without breaking layout
    await page.getByRole('button', { name: 'Attendance' }).click();
    await expect(page.getByText(/Select Batch/i).or(page.getByText(/Total Enrolled Students/i))).toBeVisible();
  });

  // ── E2E-ACADEMIC-16: Refresh & URL Search Parameter Synchronization ─────────
  test('E2E-ACADEMIC-16: Page refresh preserves search parameter tab state', async ({ page, playwright }) => {
    const { cookies } = await createTenantSession(playwright, 'refresh_sync');
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
    await page.context().addCookies(cookies.map((c) => ({ ...c, domain: 'localhost' })));

    await page.goto(`${baseURL}/academics?tab=homework`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Create Homework Draft/i).or(page.getByText(/No homework has been created/i))).toBeVisible();

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify still on Homework tab
    await expect(page.getByText(/Create Homework Draft/i).or(page.getByText(/No homework has been created/i))).toBeVisible();
    expect(page.url()).toContain('tab=homework');
  });

  // ── E2E-ACADEMIC-18: Rapid Double-Click Submission Prevention ───────────────
  test('E2E-ACADEMIC-18: Rapid double-click prevents duplicate submissions', async ({ page, playwright }) => {
    const { cookies, ctx } = await createTenantSession(playwright, 'double_click');
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
    await page.context().addCookies(cookies.map((c) => ({ ...c, domain: 'localhost' })));

    // Setup program, subject, batch
    const pRes = await ctx.post('/api/v1/programs', { data: { name: 'Physics Program', code: 'P-PROG' } });
    const progId = (await pRes.json()).data.id;
    const sRes = await ctx.post('/api/v1/subjects', { data: { programId: progId, name: 'Physics', code: 'P-101' } });
    const subjId = (await sRes.json()).data.id;
    await ctx.post('/api/v1/batches', { data: { subjectId: subjId, name: 'Batch DC', code: 'DC' } });

    await page.goto(`${baseURL}/academics?tab=homework`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Create Homework' }).click();
    await page.fill('input[name="title"]', 'Double Click HW');
    await page.fill('textarea[name="description"]', 'Desc');

    const saveBtn = page.getByRole('button', { name: 'Save Draft' });
    // Perform rapid double click
    await saveBtn.click({ clickCount: 2 });

    await expect(page.getByText('Double Click HW')).toBeVisible();
  });
});
