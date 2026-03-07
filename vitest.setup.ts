import { vi } from 'vitest';

// Set mandatory environment variables for all tests
process.env.IMMICH_API_URL = 'http://immich.test';
process.env.IMMICH_API_KEY = 'test-key';
process.env.AUTH_SECRET = 'test-auth-secret-32-chars-long-min';
process.env.SITE_TITLE = 'Test Gallery';
