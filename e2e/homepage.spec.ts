import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads and renders the hero section', async ({ page }) => {
    await page.goto('/');
    // Wait for the hero section to appear
    const hero = page.locator('.hero');
    await expect(hero).toBeVisible();
  });

  test('shows the site title in the hero', async ({ page }) => {
    await page.goto('/');
    const title = page.locator('.hero__title');
    await expect(title).toBeVisible();
    const text = await title.textContent();
    expect(text).toBeTruthy();
  });

  test('has navigation links in the header', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('.header__nav');
    await expect(nav).toBeVisible();

    // Should have at least the Home and About links
    const links = nav.locator('.header__nav-link');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('hero nav links are present for subpages', async ({ page }) => {
    await page.goto('/');
    const heroNav = page.locator('.hero__nav');
    await expect(heroNav).toBeVisible();
    const links = heroNav.locator('.hero__nav-link');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
