/**
 * Zod-validated environment variables.
 * Parsed once at startup — all env access should go through this module.
 */

import { z } from 'zod';

const envSchema = z.object({
  /** Base URL of your Immich instance, e.g. https://immich.example.com */
  IMMICH_API_URL: z
    .string()
    .url('IMMICH_API_URL must be a valid URL')
    .transform((url) => url.replace(/\/+$/, '')),

  /** Immich API key (from Admin → API Keys) */
  IMMICH_API_KEY: z.string().min(1, 'IMMICH_API_KEY is required'),

  /** Public site title shown in the header */
  SITE_TITLE: z.string().default('Gallery'),

  /** Subtitle displayed below the title */
  SITE_SUBTITLE: z.string().default(''),

  /** Cache TTL in seconds */
  CACHE_TTL: z.coerce.number().int().min(0).default(300),

  /** Rate limit: max requests per minute per IP */
  RATE_LIMIT_RPM: z.coerce.number().int().min(1).default(120),

  /**
   * Secret used for signing auth cookies and encrypting asset tokens.
   * If not provided, IMMICH_API_KEY will be used as a fallback (configured in config.ts).
   */
  AUTH_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ✗ ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`\n❌ Environment validation failed:\n${formatted}\n`);
  }
  return result.data;
}

/** Validated, typed environment variables. */
export const env = parseEnv();
