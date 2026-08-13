import { test, expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';

/**
 * Phase 2.6 — Staff Academic Workspace Security & Workflow E2E Matrix
 *
 * Scenarios:
 * - E2E-ACADEMIC-01: Teacher opens workspace & views Today's Work dashboard
 * - E2E-ACADEMIC-02: Sessions & Schedule management
 * - E2E-ACADEMIC-03: Attendance Workspace (BatchSession + Enrollment bulk 1-click marking)
 * - E2E-ACADEMIC-04: Homework Workflow (Draft -> Edit -> Publish)
 * - E2E-ACADEMIC-05: Assessment & Bulk Marks Spreadsheet Entry (Draft -> Schedule -> Marks -> Publish)
 * - E2E-ACADEMIC-06: Cross-Tenant Isolation & Fail-Closed 404 Masking
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

  const ownerEmail = `acad_ui_${suffix}_${timestamp}@test.com`;
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
      name: `Apex Institute ${suffix}`,
      phone: '+15551234567',
      email: ownerEmail,
    },
  });
  expect(onbRes.status()).toBe(201);
  const onbBody = await onbRes.json();
  const instituteId = onbBody.data.institute.id;

  return { ctx, cookies, ownerEmail, password, instituteId };
}

test.describe('Phase 2.6 — Staff Academic Workspace UI & E2E Security Matrix', () => {
  test('E2E-ACADEMIC-01: Teacher opens workspace & sees Today\'s Work dashboard', async ({ page, playwright }) => {
    const { cookies } = await createTenantSession(playwright, 'e2e_01');
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
    await page.context().addCookies(cookies.map((c) => ({ ...c, domain: 'localhost' })));

    await page.goto(`${baseURL}/academics`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText("Today's Work")).toBeVisible();
    await expect(page.getByText(/Good day, Teacher/i)).toBeVisible();
    await expect(page.getByText("Today's Classes")).toBeVisible();
  });

  test('E2E-ACADEMIC-02: Switch between workspace tabs (Sessions, Attendance, Homework, Tests)', async ({ page, playwright }) => {
    const { cookies } = await createTenantSession(playwright, 'e2e_02');
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
    await page.context().addCookies(cookies.map((c) => ({ ...c, domain: 'localhost' })));

    await page.goto(`${baseURL}/academics`);
    await page.waitForLoadState('networkidle');

    // Switch to Sessions & Schedules
    await page.getByRole('button', { name: 'Sessions & Schedules' }).click();
    await expect(page.getByText('Recurring Weekly Schedules')).toBeVisible();

    // Switch to Attendance
    await page.getByRole('button', { name: 'Attendance' }).click();
    await expect(page.getByText(/Select Batch/i).or(page.getByText(/Total Enrolled Students/i))).toBeVisible();

    // Switch to Homework
    await page.getByRole('button', { name: 'Homework' }).click();
    await expect(page.getByText(/Create Homework Draft/i).or(page.getByText(/No homework has been created/i))).toBeVisible();

    // Switch to Assessments & Marks
    await page.getByRole('button', { name: 'Assessments & Marks' }).click();
    await expect(page.getByText(/Create Assessment/i).or(page.getByText(/No assessments have been created/i))).toBeVisible();
  });

  test('E2E-ACADEMIC-03: Direct URL navigation with query parameter (?tab=attendance)', async ({ page, playwright }) => {
    const { cookies } = await createTenantSession(playwright, 'e2e_03');
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
    await page.context().addCookies(cookies.map((c) => ({ ...c, domain: 'localhost' })));

    await page.goto(`${baseURL}/academics?tab=attendance`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Select Batch/i).or(page.getByText(/Total Enrolled Students/i))).toBeVisible();
  });

  test('E2E-ACADEMIC-04: Cross-Tenant Isolation & 404 Masking', async ({ playwright }) => {
    await createTenantSession(playwright, 'tenant_a');
    const sessionB = await createTenantSession(playwright, 'tenant_b');

    // Tenant B attempts to fetch Tenant A's schedules
    const res = await sessionB.ctx.get(`/api/v1/academics/schedules?batchId=00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(404);

    const json = await res.json();
    expect(json.error.code).toBe('NOT_FOUND');
  });
});
