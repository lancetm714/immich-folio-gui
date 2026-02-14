import { describe, it, expect, vi } from 'vitest';

// Mock env.ts so importing config.ts doesn't trigger Zod validation
vi.mock('@/lib/env', () => ({
  env: {
    IMMICH_API_URL: 'http://localhost:2283',
    IMMICH_API_KEY: 'test-key',
    SITE_TITLE: 'Test Gallery',
    SITE_SUBTITLE: '',
    CACHE_TTL: 300,
    RATE_LIMIT_RPM: 120,
  },
}));

import { slugify } from '@/lib/config';

describe('slugify', () => {
  it('converts a simple name to lowercase with hyphens', () => {
    expect(slugify('Kloster Chorin')).toBe('kloster-chorin');
  });

  it('strips diacritics', () => {
    expect(slugify('Schöne Aussicht')).toBe('schone-aussicht');
    expect(slugify('Café Müller')).toBe('cafe-muller');
  });

  it('replaces special characters with hyphens', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
    expect(slugify('foo & bar (baz)')).toBe('foo-bar-baz');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('--leading')).toBe('leading');
    expect(slugify('trailing---')).toBe('trailing');
    expect(slugify('---both---')).toBe('both');
  });

  it('collapses consecutive hyphens', () => {
    expect(slugify('a   b   c')).toBe('a-b-c');
  });

  it('handles an empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles all-special-character input', () => {
    expect(slugify('!@#$%')).toBe('');
  });

  it('preserves numbers', () => {
    expect(slugify('Album 2024')).toBe('album-2024');
  });
});
