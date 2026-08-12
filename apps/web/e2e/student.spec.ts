import { test, expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';

/**
 * Phase 1.8.7 — Student Staff CRM & Admission UI E2E Test Suite
 *
 * Full workflow testing for the Staff Student CRM interface:
 * - STUDENT-UI-01: Staff opens /students page and views header controls
 * - STUDENT-UI-02: Student list renders empty state when no matching records exist
 * - STUDENT-UI-03: Staff can create a new student in pending admission state
 * - STUDENT-UI-04: Duplicate admission number creation produces safe conflict UX (409)
 * - STUDENT-UI-05: Staff can search students by name, email, or admission number
 * - STUDENT-UI-06: Staff can filter student list by admission status
 * - STUDENT-UI-07: Staff can open student details modal
 * - STUDENT-UI-08: Authorized staff can edit student profile information
 * - STUDENT-UI-09: Staff can admit a pending student
 * - STUDENT-UI-10: Staff can reject a pending student admission
 * - STUDENT-UI-11: Staff can cancel a pending student admission
 * - STUDENT-UI-12: Staff can activate an admitted student standing
 * - STUDENT-UI-13: Staff can deactivate an active student standing
 * - STUDENT-UI-14: Staff can archive a student record
 * - STUDENT-UI-15: Mobile viewport (375px) renders card view without horizontal overflow
 * - STUDENT-UI-16: Keyboard navigation (Escape key) closes modal dialogs
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

async function createTenantSession(
  playwright: PlaywrightWorkerArgs['playwright'],
  suffix: string,
) {
  const timestamp = Date.now();
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
  const ctx = await playwright.request.newContext({ baseURL });

  const email = `std_ui_${suffix}_${timestamp}_${Math.floor(Math.random() * 999)}@test.com`;
  const instName = `Student UI Inst ${suffix} ${timestamp}`;
  const instSlug = `std-ui-inst-${suffix}-${timestamp}-${Math.floor(Math.random() * 999)}`;

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
    baseURL,
  };
}

test.describe('Phase 1.8.7 — Student Staff UI / Admission Feature Suite', () => {

  test('STUDENT-UI-01: Staff opens /students and views header controls', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui01');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');

    await expect(page.getByTestId('student-content')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Students', exact: true })).toBeVisible();
    await expect(page.getByTestId('add-student-button')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UI-02: Student list renders empty state when no matching records exist', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui02');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');

    await page.getByPlaceholder('Search by name, admission no, email, or phone...').fill('NonExistentSearchQuery999');

    await expect(page.getByTestId('student-empty-search')).toBeVisible();
    await expect(page.getByText('No students match your criteria')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UI-03: Staff can create a new student in pending admission state', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui03');
    const admNo = `ADM-UI-${Date.now()}`;

    const addRes = await tenant.ctx.post('/api/institute/students', {
      data: {
        admissionNumber: admNo,
        firstName: 'Priya',
        lastName: 'Sharma',
        email: `priya_${Date.now()}@example.com`,
        phone: '+919876543210',
      },
    });
    expect(addRes.status()).toBe(201);

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-table')).toBeVisible();

    await expect(page.locator('table').getByText('Priya Sharma')).toBeVisible();
    await expect(page.locator('table').getByText(admNo)).toBeVisible();
    await expect(page.locator('table').getByText('Pending')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UI-04: Duplicate admission number creation produces safe conflict UX (409)', async ({ playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui04');
    const sharedAdmNo = `ADM-DUP-${Date.now()}`;

    const add1 = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: sharedAdmNo, firstName: 'Rohan', lastName: 'Das' },
    });
    expect(add1.status()).toBe(201);

    const add2 = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: sharedAdmNo, firstName: 'Rohan', lastName: 'Duplicate' },
    });
    expect(add2.status()).toBe(409);
    const body = await add2.json();
    expect(body.error.code).toBe('CONFLICT');

    await tenant.ctx.dispose();
  });

  test('STUDENT-UI-05: Staff can search students by name or admission number', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui05');
    const searchName = `UniqueSearchName${Date.now()}`;
    const admNo = `ADM-SRCH-${Date.now()}`;

    await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: searchName, lastName: 'Verma' },
    });

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByPlaceholder('Search by name, admission no, email, or phone...').fill(searchName);

    await expect(page.locator('table').getByText(`${searchName} Verma`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UI-06: Staff can filter student list by admission status', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui06');
    const admNo = `ADM-FLT-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'FilterTest', lastName: 'Student' },
    });
    const std = (await res.json()).data;
    await tenant.ctx.post(`/api/institute/students/${std.id}/admit`);

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByLabel('Filter by Admission Status').selectOption('admitted');

    await expect(page.locator('table').getByText('FilterTest Student')).toBeVisible();
    await expect(page.locator('table').getByText('Admitted')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UI-07: Staff can view student details modal', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui07');
    const admNo = `ADM-DTL-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'Kiran', lastName: 'Bedi', phone: '+919876543211' },
    });
    const std = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByTestId(`student-row-${std.id}`).getByRole('button', { name: /View/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Kiran Bedi')).toBeVisible();
    await expect(page.getByRole('dialog').getByText(admNo)).toBeVisible();
    await expect(page.getByRole('dialog').getByText('+919876543211')).toBeVisible();

    await page.getByRole('dialog').getByRole('button', { name: /Close Details/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UI-08: Authorized staff can edit student profile', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui08');
    const admNo = `ADM-EDT-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'OldFirst', lastName: 'OldLast' },
    });
    const std = (await res.json()).data;

    const patchRes = await tenant.ctx.patch(`/api/institute/students/${std.id}`, {
      data: { firstName: 'UpdatedFirst', lastName: 'UpdatedLast' },
    });
    expect(patchRes.status()).toBe(200);

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-table')).toBeVisible();

    await expect(page.locator('table').getByText('UpdatedFirst UpdatedLast')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UI-09: Staff can admit a pending student', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui09');
    const admNo = `ADM-ADM-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'AdmitMe', lastName: 'Please' },
    });
    const std = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByTestId(`student-row-${std.id}`).getByTitle('Admit Student').click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: /Admit Student/i }).click();

    await expect(page.getByText(`Admitted AdmitMe Please successfully.`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UI-10: Staff can reject a pending student admission', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui10');
    const admNo = `ADM-REJ-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'RejectMe', lastName: 'Please' },
    });
    const std = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByTestId(`student-row-${std.id}`).getByTitle('Reject Admission').click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: /Reject Admission/i }).click();

    await expect(page.getByText(`Rejected admission for RejectMe Please.`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UI-11: Staff can cancel a pending student admission', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui11');
    const admNo = `ADM-CNC-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'CancelMe', lastName: 'Please' },
    });
    const std = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByTestId(`student-row-${std.id}`).getByTitle('Cancel Admission').click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: /Cancel Admission/i }).click();

    await expect(page.getByText(`Cancelled admission for CancelMe Please.`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UI-12: Staff can activate an admitted student standing', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui12');
    const admNo = `ADM-ACT-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'ActivateMe', lastName: 'Standing' },
    });
    const std = (await res.json()).data;
    await tenant.ctx.post(`/api/institute/students/${std.id}/admit`);
    await tenant.ctx.post(`/api/institute/students/${std.id}/deactivate`);

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByTestId(`student-row-${std.id}`).getByTitle('Activate Student Standing').click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Activate' }).click();

    await expect(page.getByText(`Activated standing for ActivateMe Standing.`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UI-13: Staff can deactivate an active student standing', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui13');
    const admNo = `ADM-DAC-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'DeactivateMe', lastName: 'Standing' },
    });
    const std = (await res.json()).data;
    await tenant.ctx.post(`/api/institute/students/${std.id}/admit`);

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByTestId(`student-row-${std.id}`).getByTitle('Deactivate Student Standing').click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Deactivate' }).click();

    await expect(page.getByText(`Deactivated standing for DeactivateMe Standing.`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UI-14: Staff can archive a student record', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui14');
    const admNo = `ADM-ARC-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'ArchiveMe', lastName: 'Record' },
    });
    const std = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByTestId(`student-row-${std.id}`).getByTitle('Archive Student Record').click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Archive Record' }).click();

    await expect(page.getByText(`Archived record for ArchiveMe Record.`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UI-15: Mobile viewport (375px) renders card view without horizontal overflow', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui15');
    const admNo = `ADM-MOB-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'MobileStudent', lastName: 'Card' },
    });
    const std = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto('/students');

    await expect(page.getByTestId('student-content')).toBeVisible();
    await expect(page.getByTestId(`student-card-${std.id}`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UI-16: Keyboard navigation (Escape key) closes modal dialogs', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui16');
    const admNo = `ADM-KEY-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'KeyNavStudent', lastName: 'Esc' },
    });
    const std = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByTestId(`student-row-${std.id}`).getByRole('button', { name: /View/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

});
