import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('clicking a hero nav link navigates to a subpage', async ({ page }) => {
    await page.goto('/');
    const heroNav = page.locator('.hero__nav .hero__nav-link').first();
    const href = await heroNav.getAttribute('href');
    expect(href).toBeTruthy();

    await heroNav.click();
    await page.waitForURL(`**${href}`);
    expect(page.url()).toContain(href);
  });

  test('header About link navigates to /about', async ({ page }) => {
    await page.goto('/');
    const aboutLink = page.locator('.header__nav-link', { hasText: 'About' });
    await aboutLink.click();
    await page.waitForURL('**/about');
    expect(page.url()).toContain('/about');
  });

  test('header Home link navigates back to /', async ({ page }) => {
    await page.goto('/about');
    const homeLink = page.locator('.header__nav-link', { hasText: 'Home' });
    await homeLink.click();
    await page.waitForURL('**/');
    // Accept both "/" and "?..." after root
    expect(new URL(page.url()).pathname).toBe('/');
  });
});
