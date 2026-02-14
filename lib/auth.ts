/**
 * Album authentication helpers.
 * Uses HMAC tokens stored in HttpOnly cookies — no database needed.
 *
 * Token = HMAC-SHA256(slug + password, apiKey)
 * Cookie = lb_auth_<slug> = <token>
 */

import crypto from 'crypto';
import { getConfig, SubpageConfig } from './config';

const TOKEN_EXPIRY_HOURS = 24;

function hmac(data: string): string {
    return crypto
        .createHmac('sha256', getConfig().immich.apiKey)
        .update(data)
        .digest('hex');
}

function authToken(slug: string, password: string): string {
    return hmac(`${slug}:${password}`);
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
export function authenticate(
    slug: string,
    password: string,
): string | null {
    const sp = findSubpageBySlug(slug);
    if (!sp?.password) return null;

    if (password !== sp.password) return null;

    const token = authToken(slug, password);
    const maxAge = TOKEN_EXPIRY_HOURS * 60 * 60;

    return `${cookieName(slug)}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Strict`;
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
        return crypto.timingSafeEqual(
            Buffer.from(cookie, 'hex'),
            Buffer.from(expected, 'hex'),
        );
    } catch {
        return false;
    }
}
