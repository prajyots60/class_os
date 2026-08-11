import { test, expect } from '@playwright/test';

test.describe('CoachingOS Web Application E2E Smoke Suite', () => {
  test('renders marketing landing page with primary headline and CTA actions', async ({ page }) => {
    await page.goto('/');

    // Verify main H1 title heading
    const mainHeading = page.getByRole('heading', {
      name: /Run your coaching institute from one place/i,
      level: 1,
    });
    await expect(mainHeading).toBeVisible();

    // Verify primary and secondary CTA buttons exist
    await expect(page.getByRole('link', { name: /Get Started/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Sign In/i }).first()).toBeVisible();
  });

  test('handles unauthorized auth endpoint requests safely', async ({ page }) => {
    const response = await page.request.get('/api/auth/get-session');
    // Better Auth get-session returns 200 with null body when unauthenticated
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toBeNull();
  });
});
