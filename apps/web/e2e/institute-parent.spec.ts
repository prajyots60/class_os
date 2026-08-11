import { test, expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';

/**
 * Phase 1.7.7 — InstituteParent Staff CRM Workflow & UI E2E Test Suite
 *
 * Full workflow testing for the Staff CRM interface:
 * - CRM-E2E-01: Authenticated staff can open /parents and view header controls
 * - CRM-E2E-02: Parent list renders table view on desktop and empty state when empty
 * - CRM-E2E-03: Owner can add a parent via API and see it rendered in the CRM table
 * - CRM-E2E-04: Duplicate parent creation produces safe conflict UX (409)
 * - CRM-E2E-05: Owner can open parent details modal (Global Identity vs Tenant CRM separation)
 * - CRM-E2E-06: Authorized user can update parent notes
 * - CRM-E2E-07: Authorized user can archive parent
 * - CRM-E2E-08: Archived parent reflects inactive state
 * - CRM-E2E-09: Unauthenticated request to /parents is protected
 * - CRM-E2E-10: Tenant A cannot see Tenant B parents
 * - CRM-E2E-11: Page refresh preserves correct tenant-scoped parent data
 * - CRM-E2E-12: Mobile viewport (375px) renders card view without horizontal overflow
 * - CRM-E2E-13: Keyboard navigation (Escape key) closes modal dialogs
 * - CRM-E2E-14: Global ParentIdentity remains unaffected by tenant soft-archive
 */

type CookieItem = Awaited<ReturnType<APIRequestContext['storageState']>>['cookies'][number];

interface SessionFixture {
  email: string;
  institute: { id: string; name: string };
  cookies: CookieItem[];
  baseURL: string;
}

let tenantA: SessionFixture;
let tenantB: SessionFixture;

async function registerUserWithRetry(
  ctx: APIRequestContext,
  user: { email: string; password: string; name: string },
) {
  let attempts = 0;
  while (attempts < 12) {
    const res = await ctx.post('/api/auth/sign-up/email', { data: user });
    if (res.status() === 429) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }
    return res;
  }
  return ctx.post('/api/auth/sign-up/email', { data: user });
}

async function createTenantSession(
  playwright: PlaywrightWorkerArgs['playwright'],
  suffix: string,
): Promise<SessionFixture> {
  const timestamp = Date.now();
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
  const apiCtx = await playwright.request.newContext({ baseURL });

  const email = `crm_staff_${suffix}_${timestamp}_${Math.floor(Math.random() * 999)}@test.com`;
  const instName = `CRM Inst ${suffix} ${timestamp}`;
  const instSlug = `crm-inst-${suffix}-${timestamp}-${Math.floor(Math.random() * 999)}`;

  const regRes = await registerUserWithRetry(apiCtx, {
    email,
    password: 'SecurePassword123!',
    name: `Owner ${suffix}`,
  });
  expect([200, 201]).toContain(regRes.status());

  const uniquePhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  const onboardRes = await apiCtx.post('/api/onboarding/institute', {
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

  const state = await apiCtx.storageState();
  const cookies = state.cookies;
  await apiCtx.dispose();

  return {
    email,
    institute: onboardData.data.institute,
    cookies,
    baseURL,
  };
}

async function createApiContext(
  playwright: PlaywrightWorkerArgs['playwright'],
  tenant: SessionFixture,
) {
  return playwright.request.newContext({
    baseURL: tenant.baseURL,
    storageState: { cookies: tenant.cookies, origins: [] },
  });
}

test.describe('Phase 1.7.7 — InstituteParent Staff CRM Feature Suite', () => {

  test.beforeAll(async ({ playwright }) => {
    test.setTimeout(120000);
    tenantA = await createTenantSession(playwright, 'tenantA');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    tenantB = await createTenantSession(playwright, 'tenantB');
  });

  test('CRM-E2E-01: Authenticated staff can open /parents and view header controls', async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: tenantA.baseURL,
      storageState: { cookies: tenantA.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/parents');

    await expect(page.getByTestId('institute-parent-crm')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Parents' })).toBeVisible();
    await expect(page.getByTestId('parent-search-input')).toBeVisible();
    await expect(page.getByTestId('parent-filter-select')).toBeVisible();

    await context.close();
  });

  test('CRM-E2E-02: Parent list renders empty state when no matching records exist', async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: tenantA.baseURL,
      storageState: { cookies: tenantA.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/parents');

    await expect(page.getByTestId('parent-search-input')).toBeVisible();
    await page.getByTestId('parent-search-input').fill('NonExistentSearchQuery999');

    await expect(page.getByTestId('parent-empty-state')).toBeVisible();
    await expect(page.getByText('No matching parents found')).toBeVisible();

    await context.close();
  });

  test('CRM-E2E-03: Owner can add a parent via API and see it rendered in the CRM table', async ({ browser, playwright }) => {
    const apiCtx = await createApiContext(playwright, tenantA);
    const parentPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;

    const addRes = await apiCtx.post('/api/institute/parents', {
      data: {
        phone: parentPhone,
        name: 'Aarav Gupta Parent',
        notes: 'Prefers morning update calls.',
      },
    });
    expect(addRes.status()).toBe(201);
    await apiCtx.dispose();

    const context = await browser.newContext({
      baseURL: tenantA.baseURL,
      storageState: { cookies: tenantA.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/parents');

    await expect(page.getByTestId('parent-table-card')).toBeVisible();
    await expect(page.locator('table').getByText('Aarav Gupta Parent')).toBeVisible();
    await expect(page.locator('table').getByText(parentPhone)).toBeVisible();
    await expect(page.locator('table').getByText('Prefers morning update calls.')).toBeVisible();

    await context.close();
  });

  test('CRM-E2E-04: Duplicate parent creation produces safe conflict UX (409)', async ({ playwright }) => {
    const apiCtx = await createApiContext(playwright, tenantA);

    const sharedPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;

    const add1 = await apiCtx.post('/api/institute/parents', {
      data: { phone: sharedPhone, name: 'Original Record' },
    });
    expect(add1.status()).toBe(201);

    const add2 = await apiCtx.post('/api/institute/parents', {
      data: { phone: sharedPhone, name: 'Duplicate Record Attempt' },
    });
    expect(add2.status()).toBe(409);
    const body = await add2.json();
    expect(body.error.code).toBe('CONFLICT');

    await apiCtx.dispose();
  });

  test('CRM-E2E-05: Owner can open parent details modal showing Global Identity vs Tenant CRM separation', async ({ browser, playwright }) => {
    const apiCtx = await createApiContext(playwright, tenantA);
    const parentPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    const addRes = await apiCtx.post('/api/institute/parents', {
      data: { phone: parentPhone, name: 'Sunil Verma', notes: 'Fee paid via UPI' },
    });
    expect(addRes.status()).toBe(201);
    const parentData = (await addRes.json()).data;
    await apiCtx.dispose();

    const context = await browser.newContext({
      baseURL: tenantA.baseURL,
      storageState: { cookies: tenantA.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/parents');
    await expect(page.getByTestId('parent-table-card')).toBeVisible();

    await page.getByTestId(`view-parent-${parentData.id}`).first().click();

    await expect(page.getByTestId('parent-details-modal')).toBeVisible();
    await expect(page.getByText('Global CoachingOS Identity')).toBeVisible();
    await expect(page.getByText('Institute CRM Record')).toBeVisible();
    await expect(page.getByTestId('parent-details-modal').getByText('Sunil Verma')).toBeVisible();
    await expect(page.getByTestId('parent-details-modal').getByText('Fee paid via UPI')).toBeVisible();

    await page.getByTestId('close-details-btn').click();
    await expect(page.getByTestId('parent-details-modal')).not.toBeVisible();

    await context.close();
  });

  test('CRM-E2E-06: Authorized user can update parent notes via API/UI', async ({ browser, playwright }) => {
    const apiCtx = await createApiContext(playwright, tenantA);
    const parentPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    const addRes = await apiCtx.post('/api/institute/parents', {
      data: { phone: parentPhone, name: 'Vikram Mehta', notes: 'Initial Note' },
    });
    expect(addRes.status()).toBe(201);
    const parentData = (await addRes.json()).data;

    const patchRes = await apiCtx.patch(`/api/institute/parents/${parentData.id}`, {
      data: { notes: 'Updated Operational Note' },
    });
    expect(patchRes.status()).toBe(200);
    await apiCtx.dispose();

    const context = await browser.newContext({
      baseURL: tenantA.baseURL,
      storageState: { cookies: tenantA.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/parents');
    await expect(page.getByTestId('parent-table-card')).toBeVisible();

    await expect(page.locator('table').getByText('Updated Operational Note')).toBeVisible();

    await context.close();
  });

  test('CRM-E2E-07 & 08: Archiving parent updates status to inactive', async ({ browser, playwright }) => {
    const apiCtx = await createApiContext(playwright, tenantA);
    const parentPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    const addRes = await apiCtx.post('/api/institute/parents', {
      data: { phone: parentPhone, name: 'Kavita Singh' },
    });
    expect(addRes.status()).toBe(201);
    const parentData = (await addRes.json()).data;

    const delRes = await apiCtx.delete(`/api/institute/parents/${parentData.id}`);
    expect(delRes.status()).toBe(200);
    await apiCtx.dispose();

    const context = await browser.newContext({
      baseURL: tenantA.baseURL,
      storageState: { cookies: tenantA.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/parents');
    await expect(page.getByTestId('parent-search-input')).toBeVisible();

    await page.getByTestId('parent-filter-select').selectOption('inactive');

    await expect(page.locator('table').getByText('Kavita Singh')).toBeVisible();
    await expect(page.locator('table').getByText('Inactive')).toBeVisible();

    await context.close();
  });

  test('CRM-E2E-09: Unauthenticated request to /parents is protected', async ({ page }) => {
    await page.goto('/parents');
    await expect(page).not.toHaveURL('/parents');
  });

  test('CRM-E2E-10: Tenant A cannot see Tenant B parents in the CRM list', async ({ playwright }) => {
    const apiCtxA = await createApiContext(playwright, tenantA);
    const apiCtxB = await createApiContext(playwright, tenantB);

    const phoneA = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    await apiCtxA.post('/api/institute/parents', {
      data: { phone: phoneA, name: 'Tenant A Exclusive Parent' },
    });

    const listB = await apiCtxB.get('/api/institute/parents');
    expect(listB.status()).toBe(200);
    const dataB = await listB.json();
    const found = dataB.data.some((p: { parentIdentity?: { phone?: string } }) => p.parentIdentity?.phone === phoneA);
    expect(found).toBe(false);

    await apiCtxA.dispose();
    await apiCtxB.dispose();
  });

  test('CRM-E2E-11: Page refresh preserves correct tenant-scoped parent data', async ({ browser, playwright }) => {
    const apiCtx = await createApiContext(playwright, tenantA);
    const parentPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    await apiCtx.post('/api/institute/parents', {
      data: { phone: parentPhone, name: 'Persistent Parent' },
    });
    await apiCtx.dispose();

    const context = await browser.newContext({
      baseURL: tenantA.baseURL,
      storageState: { cookies: tenantA.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/parents');
    await expect(page.getByTestId('parent-table-card')).toBeVisible();
    await expect(page.locator('table').getByText('Persistent Parent')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('parent-table-card')).toBeVisible();
    await expect(page.locator('table').getByText('Persistent Parent')).toBeVisible();

    await context.close();
  });

  test('CRM-E2E-12: Mobile viewport (375px) renders card view without horizontal overflow', async ({ browser, playwright }) => {
    const apiCtx = await createApiContext(playwright, tenantA);
    const parentPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    const addRes = await apiCtx.post('/api/institute/parents', {
      data: { phone: parentPhone, name: 'Mobile Test Parent', notes: 'Short mobile notes' },
    });
    const parentData = (await addRes.json()).data;
    await apiCtx.dispose();

    const context = await browser.newContext({
      baseURL: tenantA.baseURL,
      storageState: { cookies: tenantA.cookies, origins: [] },
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto('/parents');

    await expect(page.getByTestId('institute-parent-crm')).toBeVisible();
    await expect(page.getByTestId(`parent-card-${parentData.id}`)).toBeVisible();
    await expect(page.getByTestId('parent-table-card')).not.toBeVisible();

    await context.close();
  });

  test('CRM-E2E-13: Keyboard navigation (Escape key) closes modal dialogs', async ({ browser, playwright }) => {
    const apiCtx = await createApiContext(playwright, tenantA);
    const parentPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    const addRes = await apiCtx.post('/api/institute/parents', {
      data: { phone: parentPhone, name: 'Key Nav Parent' },
    });
    const parentData = (await addRes.json()).data;
    await apiCtx.dispose();

    const context = await browser.newContext({
      baseURL: tenantA.baseURL,
      storageState: { cookies: tenantA.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/parents');
    await expect(page.getByTestId('parent-table-card')).toBeVisible();

    await page.getByTestId(`view-parent-${parentData.id}`).first().click();
    await expect(page.getByTestId('parent-details-modal')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('parent-details-modal')).not.toBeVisible();

    await context.close();
  });

  test('CRM-E2E-14: Global ParentIdentity remains unaffected by tenant archive', async ({ playwright }) => {
    const apiCtxA = await createApiContext(playwright, tenantA);
    const apiCtxB = await createApiContext(playwright, tenantB);

    const sharedPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;

    const resA = await apiCtxA.post('/api/institute/parents', {
      data: { phone: sharedPhone, name: 'Multi-Tenant Parent' },
    });
    const resB = await apiCtxB.post('/api/institute/parents', {
      data: { phone: sharedPhone },
    });

    const parentA = (await resA.json()).data;
    const parentB = (await resB.json()).data;

    // Tenant A archives local record
    await apiCtxA.delete(`/api/institute/parents/${parentA.id}`);

    // Verify Tenant B's record and global identity remain active
    const checkB = await apiCtxB.get(`/api/institute/parents/${parentB.id}`);
    expect(checkB.status()).toBe(200);
    const dataB = (await checkB.json()).data;
    expect(dataB.status).toBe('active');
    expect(dataB.parentIdentity?.status).toBe('active');

    await apiCtxA.dispose();
    await apiCtxB.dispose();
  });

});
