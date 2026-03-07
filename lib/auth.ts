/**
 * Album authentication helpers.
 * Uses HMAC tokens stored in HttpOnly cookies — no database needed.
 *
 * Token = HMAC-SHA256(slug + passwordSecret, authSecret)
 * Cookie = lb_auth_<slug> = <token>
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getConfig, SubpageConfig } from './config';

const TOKEN_EXPIRY_HOURS = 24;

/**
 * Check if a string looks like a bcrypt hash.
 */
function isHash(str: string): boolean {
  return str.startsWith('$2a$') || str.startsWith('$2b$') || str.startsWith('$2y$');
}

function hmac(data: string): string {
  return crypto.createHmac('sha256', getConfig().authSecret).update(data).digest('hex');
}

function authToken(slug: string, passwordSecret: string): string {
  // Use the hash/password as part of the HMAC for a secure, unique session token
  return hmac(`${slug}:${passwordSecret}`);
}

function cookieName(slug: string): string {
  return `lb_auth_${slug}`;
}

/**
 * Find the SubpageConfig for a given slug.
 */
export function findSubpageBySlug(slug: string): SubpageConfig | undefined {
  return getConfig().subpages.find((sp) => sp.slug === slug);
}

/**
 * Check if a slug corresponds to a password-protected subpage.
 */
export function isProtected(slug: string): boolean {
  const sp = findSubpageBySlug(slug);
  return !!sp?.password;
}

/**
 * Validate a password attempt and return a Set-Cookie header value on success.
 * Returns null if the password is wrong.
 */
export function authenticate(slug: string, password: string): string | null {
  const sp = findSubpageBySlug(slug);
  if (!sp?.password) return null;

  let isValid = false;
  if (isHash(sp.password)) {
    isValid = bcrypt.compareSync(password, sp.password);
  } else {
    // Plaintext fallback (deprecated)
    isValid = password === sp.password;
    if (isValid) {
      console.warn(
        `\n⚠️  SECURITY WARNING: Subpage "${slug}" is using a plaintext password in gallery.yaml.\n` +
          `   Please hash it for better security. You can use: npx bcryptjs ${sp.password}\n`,
      );
    }
  }

  if (!isValid) return null;

  const token = authToken(slug, sp.password);
  const maxAge = TOKEN_EXPIRY_HOURS * 60 * 60;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  return `${cookieName(slug)}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Strict${secure}`;
}

/**
 * Check if the request has a valid auth cookie for the given slug.
 * Works with the cookies() API from Next.js server components.
 */
export function isAuthenticated(
  slug: string,
  getCookie: (name: string) => string | undefined,
): boolean {
  const sp = findSubpageBySlug(slug);
  if (!sp?.password) return true; // not protected

  const cookie = getCookie(cookieName(slug));
  if (!cookie) return false;

  const expected = authToken(slug, sp.password);
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(cookie, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
