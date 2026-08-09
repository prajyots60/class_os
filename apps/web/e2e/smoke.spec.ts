import { test, expect } from '@playwright/test';

test.describe('CoachingOS Web Application E2E Smoke Suite', () => {
  test('renders home page and design showcase with semantic headings', async ({ page }) => {
    await page.goto('/');

    // Verify main h1 title heading
    const mainHeading = page.getByRole('heading', { name: /Sharma Physics Classes/i, level: 1 });
    await expect(mainHeading).toBeVisible();

    // Verify Theme selector options exist
    await expect(page.getByText(/Theme A/i)).toBeVisible();
    await expect(page.getByText(/Theme B/i)).toBeVisible();
  });

  test('handles unauthorized auth endpoint requests safely', async ({ page }) => {
    const response = await page.request.get('/api/auth/get-session');
    // Better Auth get-session returns 200 with null body when unauthenticated
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toBeNull();
  });
});
