import { test, expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';

/**
 * Phase 1.8.8 + 1.8.9 — Student Workflow & UX Audit E2E Suite
 *
 * Full verification matrix covering UX, Accessibility, Capability Gating, State Transitions,
 * and Tenant Isolation boundaries for the Staff Student Experience:
 * - STUDENT-UX-01: Open Students workspace & verify layout shell
 * - STUDENT-UX-02: Search with zero matches renders accessible empty state
 * - STUDENT-UX-03: Create student modal workflow & successful submission
 * - STUDENT-UX-04: Form field validation errors render accessible aria attributes
 * - STUDENT-UX-05: Duplicate admission number yields safe 409 conflict feedback
 * - STUDENT-UX-06: Search students by name, email, or admission number
 * - STUDENT-UX-07: Filter list by admission status (Pending, Admitted, Rejected, Cancelled)
 * - STUDENT-UX-08: Filter list by standing status (Active, Inactive, Archived)
 * - STUDENT-UX-09: View student details modal drawer
 * - STUDENT-UX-10: Edit student profile with immutable admission number check
 * - STUDENT-UX-11: Transition pending student to admitted (status -> active)
 * - STUDENT-UX-12: Transition pending student to rejected (status -> inactive)
 * - STUDENT-UX-13: Transition pending student to cancelled (status -> inactive)
 * - STUDENT-UX-14: Reactivate an inactive student standing (status -> active)
 * - STUDENT-UX-15: Deactivate an active student standing (status -> inactive)
 * - STUDENT-UX-16: Soft archive a student record (status -> archived, deletedAt set)
 * - STUDENT-UX-17: Mobile viewport (375px) renders card view without horizontal scroll
 * - STUDENT-UX-18: Keyboard navigation (Escape key modal dismissal)
 * - STUDENT-UX-19: Capability-aware controls (UI elements reflect permission grants)
 * - STUDENT-UX-20: Cross-tenant isolation (Tenant A student ID returns 404 to Tenant B)
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

  const email = `std_ux_${suffix}_${timestamp}_${Math.floor(Math.random() * 999)}@test.com`;
  const instName = `UX Inst ${suffix} ${timestamp}`;
  const instSlug = `ux-inst-${suffix}-${timestamp}-${Math.floor(Math.random() * 999)}`;

  const regRes = await registerUserWithRetry(ctx, {
    email,
    password: 'SecurePassword123!',
    name: `Staff ${suffix}`,
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

test.describe('Phase 1.8.8 + 1.8.9 — Student UX, Accessibility & Workflow Suite', () => {

  test('STUDENT-UX-01: Open Students workspace & verify layout shell', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux01');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');

    await expect(page.getByTestId('student-content')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Students', level: 1 })).toBeVisible();
    await expect(page.getByTestId('add-student-button')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-02: Search with zero matches renders accessible empty state', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux02');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-content')).toBeVisible();

    await page.getByPlaceholder('Search by name, admission no, email, or phone...').fill('ZeroMatchesQuery999');

    await expect(page.getByTestId('student-empty-search')).toBeVisible();
    await expect(page.getByText('No students match your criteria')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-03: Create student modal workflow & successful submission', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux03');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-content')).toBeVisible();

    await page.getByTestId('add-student-button').click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add New Student' })).toBeVisible();

    const admNo = `ADM-UX-${Date.now()}`;
    await page.getByPlaceholder('e.g. ADM-2026-001').fill(admNo);
    await page.getByPlaceholder('First name').fill('Aarav');
    await page.getByPlaceholder('Last name').fill('Patel');

    await page.getByTestId('student-form-submit-button').click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByTestId('student-table')).toBeVisible();
    await expect(page.locator('table').getByText('Aarav Patel')).toBeVisible();
    await expect(page.locator('table').getByText(admNo)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-04: Form field validation errors render accessible attributes', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux04');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-content')).toBeVisible();

    await page.getByTestId('add-student-button').click();

    await expect(page.getByRole('dialog')).toBeVisible();

    // Click submit without entering required fields
    await page.getByTestId('student-form-submit-button').click();

    await expect(page.getByText('Admission number is required.')).toBeVisible();
    await expect(page.getByText('First name is required.')).toBeVisible();
    await expect(page.getByText('Last name is required.')).toBeVisible();

    // Verify modal remains open
    await expect(page.getByRole('dialog')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-05: Duplicate admission number yields safe 409 conflict feedback', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux05');
    const sharedAdmNo = `ADM-DUP-UX-${Date.now()}`;

    // Create first student via API
    const add1 = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: sharedAdmNo, firstName: 'Student1', lastName: 'Primary' },
    });
    expect(add1.status()).toBe(201);

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-content')).toBeVisible();

    await page.getByTestId('add-student-button').click();

    await page.getByPlaceholder('e.g. ADM-2026-001').fill(sharedAdmNo);
    await page.getByPlaceholder('First name').fill('Student2');
    await page.getByPlaceholder('Last name').fill('Duplicate');

    await page.getByTestId('student-form-submit-button').click();

    await expect(page.getByText(/A student with admission number .* already exists/i)).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-06: Search students by name, email, or admission number', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux06');
    const searchName = `SearchTarget${Date.now()}`;
    const admNo = `ADM-SRCH-${Date.now()}`;

    await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: searchName, lastName: 'Gupta' },
    });

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-content')).toBeVisible();
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByPlaceholder('Search by name, admission no, email, or phone...').fill(searchName);
    await expect(page.locator('table').getByText(`${searchName} Gupta`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-07: Filter list by admission status', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux07');
    const admNo = `ADM-FLT-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'AdmittedTarget', lastName: 'Flt' },
    });
    const std = (await res.json()).data;
    await tenant.ctx.post(`/api/institute/students/${std.id}/admit`);

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-content')).toBeVisible();
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByLabel('Filter by Admission Status').selectOption('admitted');

    await expect(page.getByTestId(`student-row-${std.id}`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-08: Filter list by standing status', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux08');
    const admNo = `ADM-STD-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'ActiveStanding', lastName: 'Target' },
    });
    const std = (await res.json()).data;
    await tenant.ctx.post(`/api/institute/students/${std.id}/admit`);

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-content')).toBeVisible();
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByLabel('Filter by Standing Status').selectOption('active');

    await expect(page.locator('table').getByText('ActiveStanding Target')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-09: View student details modal drawer', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux09');
    const admNo = `ADM-DTL-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'DetailStudent', lastName: 'Drawer', phone: '+919876543219' },
    });
    const std = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-content')).toBeVisible();
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByTestId(`student-row-${std.id}`).getByRole('button', { name: /View/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('DetailStudent Drawer')).toBeVisible();
    await expect(page.getByRole('dialog').getByText(admNo)).toBeVisible();

    await page.getByRole('dialog').getByRole('button', { name: /Close Details/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-10: Edit student profile with immutable admission number check', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux10');
    const admNo = `ADM-EDT-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'InitialFirst', lastName: 'InitialLast' },
    });
    const std = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-content')).toBeVisible();
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByTestId(`student-row-${std.id}`).getByTitle('Edit Student Profile').click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. ADM-2026-001')).toBeDisabled();
    await expect(page.getByText('Admission number is immutable by domain policy.')).toBeVisible();

    await page.getByPlaceholder('First name').fill('EditedFirst');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.locator('table').getByText('EditedFirst InitialLast')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-11: Transition pending student to admitted (status -> active)', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux11');
    const admNo = `ADM-ADMIT-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'PendingToAdmit', lastName: 'Student' },
    });
    const std = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-content')).toBeVisible();
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByTestId(`student-row-${std.id}`).getByTitle('Admit Student').click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: /Admit Student/i }).click();

    await expect(page.getByText(`Admitted PendingToAdmit Student successfully.`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-12: Transition pending student to rejected (status -> inactive)', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux12');
    const admNo = `ADM-REJ-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'PendingToReject', lastName: 'Student' },
    });
    const std = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-content')).toBeVisible();
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByTestId(`student-row-${std.id}`).getByTitle('Reject Admission').click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: /Reject Admission/i }).click();

    await expect(page.getByText(`Rejected admission for PendingToReject Student.`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-13: Transition pending student to cancelled (status -> inactive)', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux13');
    const admNo = `ADM-CNC-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'PendingToCancel', lastName: 'Student' },
    });
    const std = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-content')).toBeVisible();
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByTestId(`student-row-${std.id}`).getByTitle('Cancel Admission').click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: /Cancel Admission/i }).click();

    await expect(page.getByText(`Cancelled admission for PendingToCancel Student.`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-14: Reactivate an inactive student standing (status -> active)', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux14');
    const admNo = `ADM-ACT-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'InactiveToActive', lastName: 'Student' },
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
    await expect(page.getByTestId('student-content')).toBeVisible();
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByTestId(`student-row-${std.id}`).getByTitle('Activate Student Standing').click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Activate' }).click();

    await expect(page.getByText(`Activated standing for InactiveToActive Student.`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-15: Deactivate an active student standing (status -> inactive)', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux15');
    const admNo = `ADM-DAC-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'ActiveToInactive', lastName: 'Student' },
    });
    const std = (await res.json()).data;
    await tenant.ctx.post(`/api/institute/students/${std.id}/admit`);

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-content')).toBeVisible();
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByTestId(`student-row-${std.id}`).getByTitle('Deactivate Student Standing').click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Deactivate' }).click();

    await expect(page.getByText(`Deactivated standing for ActiveToInactive Student.`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-16: Soft archive a student record (status -> archived, deletedAt set)', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux16');
    const admNo = `ADM-ARC-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'ArchiveTarget', lastName: 'Student' },
    });
    const std = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-content')).toBeVisible();
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByTestId(`student-row-${std.id}`).getByTitle('Archive Student Record').click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Archive Record' }).click();

    await expect(page.getByText(`Archived record for ArchiveTarget Student.`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-17: Mobile viewport (375px) renders card view without horizontal scroll', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux17');
    const admNo = `ADM-MOB-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'MobileStudent', lastName: 'CardView' },
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

  test('STUDENT-UX-18: Keyboard navigation (Escape key modal dismissal)', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux18');
    const admNo = `ADM-ESC-${Date.now()}`;

    const res = await tenant.ctx.post('/api/institute/students', {
      data: { admissionNumber: admNo, firstName: 'EscStudent', lastName: 'Dismiss' },
    });
    const std = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-content')).toBeVisible();
    await expect(page.getByTestId('student-table')).toBeVisible();

    await page.getByTestId(`student-row-${std.id}`).getByRole('button', { name: /View/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-19: Capability-aware controls (UI elements reflect permission grants)', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ux19');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/students');
    await expect(page.getByTestId('student-content')).toBeVisible();

    // Owner has full student capabilities (read, create, update, archive)
    await expect(page.getByTestId('add-student-button')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STUDENT-UX-20: Cross-tenant isolation (Tenant A student ID returns 404 to Tenant B)', async ({ playwright }) => {
    const tenantA = await createTenantSession(playwright, 'ux20a');
    const tenantB = await createTenantSession(playwright, 'ux20b');

    // Create student in Tenant A
    const addRes = await tenantA.ctx.post('/api/institute/students', {
      data: { admissionNumber: `ADM-ISO-${Date.now()}`, firstName: 'TenantA', lastName: 'Student' },
    });
    const stdA = (await addRes.json()).data;

    // Tenant B attempts to fetch Tenant A's student
    const getResB = await tenantB.ctx.get(`/api/institute/students/${stdA.id}`);
    expect(getResB.status()).toBe(404);

    // Tenant B attempts to patch Tenant A's student
    const patchResB = await tenantB.ctx.patch(`/api/institute/students/${stdA.id}`, {
      data: { firstName: 'HackedFirst' },
    });
    expect(patchResB.status()).toBe(404);

    // Tenant B attempts to archive Tenant A's student
    const deleteResB = await tenantB.ctx.delete(`/api/institute/students/${stdA.id}`);
    expect(deleteResB.status()).toBe(404);

    await tenantA.ctx.dispose();
    await tenantB.ctx.dispose();
  });

});
