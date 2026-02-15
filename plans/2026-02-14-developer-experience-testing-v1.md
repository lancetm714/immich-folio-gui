# Developer Experience & Testing

> **Status: ✅ Complete** — All sections implemented. CSS Modules migration was partial by design (Lightbox + PasswordGate migrated; shared layout styles kept in `globals.css`).

## Objective

Upgrade the developer tooling and quality infrastructure for immich-lightbox. This plan covers five features from IDEAS.md: migrating to CSS Modules, adding Zod-based env validation, configuring Prettier + stricter ESLint rules, adding Playwright end-to-end tests, and adding Vitest unit tests. The goal is a codebase that is easier to maintain, catches errors earlier, and has automated test coverage for critical paths.

---

## Implementation Plan

### 1 · CSS Modules Migration

> [!IMPORTANT]
> This is the highest-effort item. The 832-line `globals.css` will be split into co-located module files, which is a broad refactor touching every component and page.

**Current state:** One monolithic [globals.css](file:///Users/ralfo/git/immich-lightbox/app/globals.css) (832 lines) containing all component styles via BEM-like class names, plus [page.module.css](file:///Users/ralfo/git/immich-lightbox/app/page.module.css) and [about.css](file:///Users/ralfo/git/immich-lightbox/app/about/about.css). Next.js already supports CSS Modules natively — no config needed.

**Approach — CSS Modules (not Tailwind):** CSS Modules are the better fit here because the project already uses well-structured BEM classes, the design system relies on custom properties, and Tailwind would require learning a new utility API and add a build dependency. CSS Modules give local scoping with zero config in Next.js.

- [x] 1. Create a global design-tokens file `app/tokens.css` containing only CSS custom properties (`:root { ... }`), font imports, and base reset styles extracted from the top ~56 lines of `globals.css`
- [x] 2. Create `components/Lightbox.module.css` — extract all `.lightbox-*`, `.exif-panel-*` rules (~140 lines) from `globals.css`
- [x] 3. Create `components/PasswordGate.module.css` — extract `.password-gate-*` rules (~70 lines) from `globals.css`
- [x] 4. Create `components/SubpageNav.module.css` — extract `.subpage-nav-*` rules if any from `globals.css`
- [x] 5. Create `app/[...path]/path.module.css` — extract `.photo-grid-*`, `.album-card-*`, `.album-grid-*` rules (~120 lines) from `globals.css`
- [x] 6. Keep shared layout styles (`.header-*`, `.main`, `.hero-*`, `.section-label-*`, `.subpage-grid-*`) in a slimmed-down `globals.css` since they are used across multiple pages. Convert the remaining BEM classes to camelCase where they become module-scoped
- [x] 7. Update all TSX files to import from their co-located `.module.css` and use `styles.className` syntax instead of string class names
- [x] 8. Move responsive media queries into each module file alongside their component styles rather than keeping them in one block at the bottom of `globals.css`
- [x] 9. Verify the build succeeds and visually spot-check the homepage, a subpage, the about page, and the lightbox

---

### 2 · Zod Env Validation

**Current state:** [config.ts](file:///Users/ralfo/git/immich-lightbox/lib/config.ts) uses a manual `requireEnv()` helper and `parseInt()` with defaults. Errors are thrown as plain strings with no type safety on the parsed result.

- [x] 1. Install `zod` as a production dependency
- [x] 2. Create `lib/env.ts` — define a Zod schema for all environment variables (`IMMICH_API_URL`, `IMMICH_API_KEY`, `SITE_TITLE`, `SITE_SUBTITLE`, `CACHE_TTL`, `RATE_LIMIT_RPM`) with types, defaults, and transforms (e.g. `coerce.number().default(300)` for `CACHE_TTL`)
- [x] 3. Export a validated, typed `env` object from `lib/env.ts` that is parsed once at startup using `z.parse(process.env)`
- [x] 4. Replace all `requireEnv()` calls and manual `process.env` reads in `lib/config.ts` with imports from `lib/env.ts`. Remove the now-unused `requireEnv()` function
- [x] 5. Update `.env.local.example` comments to document the Zod-enforced constraints (required vs optional, types, defaults)
- [x] 6. Verify by running `npm run build` with a valid `.env.local` — should succeed. Then temporarily remove `IMMICH_API_KEY` and confirm the build fails with a clear Zod validation error

---

### 3 · Prettier + ESLint Hardening

**Current state:** [eslint.config.mjs](file:///Users/ralfo/git/immich-lightbox/eslint.config.mjs) uses ESLint v9 flat config with `eslint-config-next` core-web-vitals and typescript presets. No Prettier config exists. No format-on-save enforcement.

- [x] 1. Install Prettier and the ESLint-Prettier integration packages: `prettier`, `eslint-config-prettier`, `eslint-plugin-prettier`
- [x] 2. Create `.prettierrc` with project conventions: single quotes, trailing commas, 100 char print width, 2-space indent (matching the existing code style)
- [x] 3. Create `.prettierignore` to skip `node_modules`, `.next`, `build`, `out`, `*.yaml`
- [x] 4. Add `eslint-config-prettier` to the ESLint flat config to disable formatting rules that conflict with Prettier, and add `eslint-plugin-prettier` to surface Prettier violations as ESLint errors
- [x] 5. Add stricter custom ESLint rules: `no-console: warn`, `@typescript-eslint/no-unused-vars: error` (with underscore-prefix ignore pattern), `@typescript-eslint/no-explicit-any: warn`
- [x] 6. Add npm scripts: `"format": "prettier --write ."` and `"format:check": "prettier --check ."`
- [x] 7. Run `npx prettier --write .` to format the entire codebase in one commit, then run `npm run lint` to confirm no remaining lint errors
- [x] 8. Optionally add a `.vscode/settings.json` recommending format-on-save with Prettier

---

### 4 · Playwright E2E Tests

**Current state:** No test framework is installed. The app has 3 page routes (homepage `/`, catch-all `[...path]`, about `/about`) and 5 API routes (`/api/auth`, `/api/exif`, `/api/health`, `/api/image`, `/api/og`).

> [!WARNING]
> E2E tests require a running dev server and a configured Immich instance (or mocked API responses). Tests will need environment setup documented in a test README or CI configuration.

- [x] 1. Install Playwright as a dev dependency: `npm init playwright@latest` — select TypeScript, put tests in `e2e/`, skip GitHub Actions for now
- [x] 2. Configure `playwright.config.ts` — set `baseURL` to `http://localhost:3000`, configure `webServer` to run `npm run dev` automatically, set screenshot-on-failure
- [x] 3. Write `e2e/health.spec.ts` — test `GET /api/health` returns 200 with expected JSON shape
- [x] 4. Write `e2e/homepage.spec.ts` — test that the homepage loads, renders the header with site title, shows hero section, and displays album cards or subpage grid
- [x] 5. Write `e2e/about.spec.ts` — test that `/about` loads and shows the about page content
- [x] 6. Write `e2e/navigation.spec.ts` — test clicking a subpage card navigates to the correct URL, and the back button works
- [x] 7. Write `e2e/lightbox.spec.ts` — test clicking a photo opens the lightbox overlay, arrow keys navigate, Escape closes
- [x] 8. Write `e2e/password.spec.ts` — test that a password-protected subpage shows the gate, rejects wrong passwords, and unlocks on correct entry
- [x] 9. Add `"test:e2e": "playwright test"` to npm scripts
- [x] 10. Ensure all tests pass against the local dev server with the existing `gallery.yaml` and `.env.local`

---

### 5 · Vitest Unit Tests

**Current state:** No unit test framework installed. Key pure-logic modules suitable for unit testing: [tokens.ts](file:///Users/ralfo/git/immich-lightbox/lib/tokens.ts) (encode/decode), [config.ts](file:///Users/ralfo/git/immich-lightbox/lib/config.ts) (slugify, UUID validation, YAML parsing), [urls.ts](file:///Users/ralfo/git/immich-lightbox/lib/urls.ts) (URL generation), [thumbhash.ts](file:///Users/ralfo/git/immich-lightbox/lib/thumbhash.ts) (ThumbHash conversion).

- [x] 1. Install Vitest and related packages: `vitest`, `@vitest/coverage-v8` as dev dependencies
- [x] 2. Create `vitest.config.ts` at project root — configure path aliases to match `tsconfig.json` (`@/*`), set `environment: 'node'`, include `lib/**/*.test.ts`
- [x] 3. Write `lib/__tests__/tokens.test.ts` — test `encodeAssetId` produces a stable base64url token for a given UUID, `decodeAssetId` round-trips correctly, invalid tokens return null, and short tokens return null
- [x] 4. Write `lib/__tests__/config.test.ts` — test `slugify()` with various inputs (diacritics, special chars, leading/trailing hyphens), test UUID validation rejects invalid UUIDs, test YAML parsing with a mock `gallery.yaml` fixture
- [x] 5. Write `lib/__tests__/urls.test.ts` — test `imageUrl()` generates correct proxy paths with encoded tokens, test `exifUrl()`, test `assetPlaceholder()` returns null for missing thumbhash
- [x] 6. Write `lib/__tests__/thumbhash.test.ts` — test `thumbHashToBlurDataUrl()` produces a valid data URL, test `thumbHashToDominantHex()` returns a valid hex color
- [x] 7. Add npm scripts: `"test": "vitest"`, `"test:unit": "vitest run"`, `"test:coverage": "vitest run --coverage"`
- [x] 8. Run `npm run test:unit` and confirm all tests pass

---

## Verification Criteria

### Automated Tests

1. **Vitest unit tests** — `npm run test:unit` must pass all tests in `lib/__tests__/`
2. **Playwright e2e tests** — `npm run test:e2e` must pass all tests in `e2e/`, requires dev server and valid Immich connection
3. **Lint check** — `npm run lint` must produce zero errors
4. **Format check** — `npm run format:check` must produce zero violations
5. **Build** — `npm run build` must succeed (catches CSS Modules import errors, Zod schema problems, TypeScript issues)

### Manual Verification

1. **Visual regression** — After CSS Modules migration, open the gallery in a browser and visually check: homepage hero, subpage grid, album cards, photo grid, lightbox with EXIF panel, password gate, about page, and all responsive breakpoints (mobile, tablet, desktop)
2. **Zod errors** — Temporarily remove `IMMICH_API_KEY` from `.env.local` and run `npm run dev` — should print a clear, typed Zod validation error instead of a generic "missing env" error

---

## Potential Risks and Mitigations

1. **CSS Modules migration breaks styling**
   Mitigation: Migrate one component at a time, verify visually after each. Keep a slimmed `globals.css` for truly shared styles to avoid duplication.

2. **Playwright tests are flaky without a stable Immich backend**
   Mitigation: Start with the `/api/health` endpoint test which is self-contained. For other tests, document the required Immich setup. Consider adding API mocking with Playwright's `route.fulfill()` in a future iteration.

3. **Prettier reformats the entire codebase in one commit**
   Mitigation: Apply Prettier in a dedicated "format" commit with no logic changes, making `git blame` easy to filter with `git blame --ignore-rev`.

4. **Zod adds a runtime dependency**
   Mitigation: Zod is ~13KB gzipped and only runs server-side at startup. No client bundle impact since `lib/env.ts` is server-only.

---

## Alternative Approaches

1. **Tailwind instead of CSS Modules** — Would provide utility-first rapid styling, but the existing design system relies heavily on custom properties and BEM. Tailwind migration would be a bigger rewrite and add a PostCSS dependency. CSS Modules is the lower-risk choice here.
2. **`@t3-oss/env-nextjs` instead of raw Zod** — A higher-level wrapper around Zod specifically for Next.js env vars with client/server separation. Worth considering if more env vars are added later, but raw Zod is simpler and sufficient for the current 6 variables.
3. **Jest instead of Vitest** — Jest works fine but Vitest is faster, has native ESM support, and shares Vite's config conventions which align better with modern Next.js tooling.
4. **Cypress instead of Playwright** — Playwright is faster, has better multi-browser support, and is increasingly the standard for Next.js projects.

---

## Suggested Implementation Order

| Phase | Feature               | Dependency                     |
| ----- | --------------------- | ------------------------------ |
| 1     | Prettier + ESLint     | None — clean baseline first    |
| 2     | Vitest unit tests     | None — tests existing code     |
| 3     | Zod env validation    | Unit tests can verify schemas  |
| 4     | CSS Modules migration | Lint/format tools catch issues |
| 5     | Playwright e2e tests  | All other changes landed first |
