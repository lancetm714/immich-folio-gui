/**
 * Theme Screenshot Generator
 *
 * Captures homepage and grid view screenshots for each theme preset.
 * Uses Playwright to wait for images to fully load (not just blurhash placeholders).
 *
 * Usage:
 *   npx tsx scripts/screenshots.ts
 *
 * Prerequisites:
 *   - Dev server NOT running (script manages its own server lifecycle)
 *   - Playwright browsers installed: npx playwright install chromium
 *
 * Output:
 *   docs/screenshots/theme-{preset}-{page}.png
 */

import { execSync, spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

const THEMES = ['studio', 'minimal', 'editorial', 'classic'];
const BASE_URL = 'http://localhost:3000';
const GRID_PATH = '/deutschland/kloster-chorin-2024'; // public subpage with photos
const OUTPUT_DIR = path.join(process.cwd(), 'docs', 'screenshots');
const GALLERY_YAML = path.join(process.cwd(), 'content', 'gallery.yaml');
const VIEWPORT = { width: 1440, height: 900 };
const IMAGE_LOAD_TIMEOUT = 8000; // ms to wait for images after networkidle

async function main() {
    // Ensure output directory exists
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Read original gallery.yaml to restore later
    const originalYaml = fs.readFileSync(GALLERY_YAML, 'utf8');

    // Dynamic import for Playwright (may not be installed globally)
    const { chromium } = await import('playwright');
    const browser = await chromium.launch();

    try {
        for (const theme of THEMES) {
            console.log(`\n🎨 Theme: ${theme}`);
            console.log('─'.repeat(50));

            // Update gallery.yaml with the theme
            const yamlWithTheme = setThemeInYaml(originalYaml, theme);
            fs.writeFileSync(GALLERY_YAML, yamlWithTheme);

            // Start dev server
            console.log('  ⏳ Starting dev server...');
            const server = startDevServer();
            await waitForServer(BASE_URL, 15000);
            console.log('  ✅ Server ready');

            const context = await browser.newContext({ viewport: VIEWPORT });
            const page = await context.newPage();

            // ── Homepage screenshot ──
            console.log('  📸 Capturing homepage...');
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });
            await waitForImages(page);
            await page.screenshot({
                path: path.join(OUTPUT_DIR, `theme-${theme}-home.png`),
                fullPage: false,
            });
            console.log(`  ✅ theme-${theme}-home.png`);

            // ── Grid view screenshot ──
            console.log('  📸 Capturing grid view...');
            await page.goto(`${BASE_URL}${GRID_PATH}`, { waitUntil: 'networkidle' });
            // Force all fade-in elements visible (don't scroll — keep album title in view)
            await page.evaluate(() => {
                document.querySelectorAll('.fade-in').forEach(el => el.classList.add('fade-in--visible'));
                // Trigger lazy images by switching to eager loading
                document.querySelectorAll('img[loading="lazy"]').forEach(img => {
                    (img as HTMLImageElement).loading = 'eager';
                });
            });
            await waitForImages(page);
            // Extra settle time for late-loading images in lower columns
            await page.waitForTimeout(3000);
            await page.screenshot({
                path: path.join(OUTPUT_DIR, `theme-${theme}-grid.png`),
                fullPage: false,
            });
            console.log(`  ✅ theme-${theme}-grid.png`);

            await context.close();

            // Stop dev server
            server.kill('SIGTERM');
            await new Promise((resolve) => server.on('close', resolve));
            console.log('  🛑 Server stopped');
        }
    } finally {
        // Always restore original gallery.yaml
        fs.writeFileSync(GALLERY_YAML, originalYaml);
        console.log('\n✅ Restored original gallery.yaml');
        await browser.close();
    }

    console.log(`\n🎉 Done! Screenshots saved to ${OUTPUT_DIR}/`);
    console.log(`   ${fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png')).join(', ')}`);
}

// ── Helpers ──────────────────────────────────────────────────────

function setThemeInYaml(yaml: string, theme: string): string {
    // Replace existing theme line or insert after the header comment
    if (/^theme:\s*.+$/m.test(yaml)) {
        return yaml.replace(/^theme:\s*.+$/m, `theme: ${theme}`);
    }
    // Insert theme after the header comments
    const marker = '# Secrets (API key, server URL) stay in .env.local.';
    return yaml.replace(marker, `${marker}\n\ntheme: ${theme}`);
}

function startDevServer(): ChildProcess {
    const server = spawn('npm', ['run', 'dev'], {
        cwd: process.cwd(),
        stdio: 'pipe',
        env: { ...process.env },
    });

    // Suppress server output unless DEBUG is set
    if (process.env.DEBUG) {
        server.stdout?.pipe(process.stdout);
        server.stderr?.pipe(process.stderr);
    }

    return server;
}

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url);
            if (res.ok) return;
        } catch {
            // Server not ready yet
        }
        await sleep(500);
    }
    throw new Error(`Server did not start within ${timeoutMs}ms`);
}

/**
 * Wait for all <img> elements to finish loading their full-resolution images.
 * This prevents capturing blurhash placeholders instead of real photos.
 */
async function waitForImages(page: import('playwright').Page): Promise<void> {
    await page.waitForTimeout(1000); // Initial settle

    await page.evaluate((timeout) => {
        return new Promise<void>((resolve) => {
            const images = Array.from(document.querySelectorAll('img'));
            let pending = images.filter((img) => !img.complete).length;

            if (pending === 0) {
                // All images already loaded, wait a bit for any CSS transitions
                setTimeout(resolve, 500);
                return;
            }

            const done = () => {
                pending--;
                if (pending <= 0) setTimeout(resolve, 500);
            };

            images.forEach((img) => {
                if (!img.complete) {
                    img.addEventListener('load', done);
                    img.addEventListener('error', done);
                }
            });

            // Safety timeout
            setTimeout(resolve, timeout);
        });
    }, IMAGE_LOAD_TIMEOUT);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Run ──────────────────────────────────────────────────────────
main().catch((err) => {
    console.error('❌ Screenshot generation failed:', err);
    // Try to restore gallery.yaml on error
    try {
        const original = fs.readFileSync(GALLERY_YAML + '.bak', 'utf8');
        fs.writeFileSync(GALLERY_YAML, original);
    } catch {
        // Backup may not exist
    }
    process.exit(1);
});
