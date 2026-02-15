import { test, expect } from '@playwright/test';

test.describe('Photo Grid', () => {
    // Use a known public subpage that has photos
    const GRID_URL = '/deutschland/kloster-chorin-2024';

    test('renders grid items with visible images', async ({ page }) => {
        await page.goto(GRID_URL);

        // Grid container should exist
        const grid = page.locator('.photo-grid');
        await expect(grid).toBeVisible();

        // Should have grid items
        const items = grid.locator('.photo-grid__item');
        const count = await items.count();
        expect(count).toBeGreaterThan(0);

        // Scroll to trigger IntersectionObserver (FadeIn)
        await items.first().scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);

        // First grid item should have real dimensions (not collapsed)
        const firstItem = items.first();
        const box = await firstItem.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(100);
        expect(box!.height).toBeGreaterThan(50);

        // Image inside should exist and have the fill layout
        const img = firstItem.locator('img');
        await expect(img).toBeAttached();
    });

    test('grid items have overflow hidden (CSS regression)', async ({ page }) => {
        // This test guards against the CSS cascade bug where a later rule
        // strips `overflow: hidden` from .photo-grid__item, which breaks
        // next/image fill rendering.
        await page.goto(GRID_URL);

        const grid = page.locator('.photo-grid');
        await expect(grid).toBeVisible();

        const item = grid.locator('.photo-grid__item').first();
        await item.scrollIntoViewIfNeeded();

        const overflow = await item.evaluate((el) => getComputedStyle(el).overflow);
        expect(overflow).toBe('hidden');
    });

    test('images load with real content (not just blurhash)', async ({ page }) => {
        await page.goto(GRID_URL);

        // Scroll to trigger lazy loading
        const grid = page.locator('.photo-grid');
        await grid.scrollIntoViewIfNeeded();
        await page.waitForTimeout(3000);

        // Check that at least one image has loaded with real pixel data
        const imgLoaded = await page.evaluate(() => {
            const img = document.querySelector('.photo-grid__item img') as HTMLImageElement;
            if (!img) return { found: false };
            return {
                found: true,
                complete: img.complete,
                naturalWidth: img.naturalWidth,
                src: img.src.substring(0, 60),
            };
        });

        expect(imgLoaded.found).toBe(true);
        expect(imgLoaded.complete).toBe(true);
        expect(imgLoaded.naturalWidth).toBeGreaterThan(0);
    });
});
