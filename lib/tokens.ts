/**
 * Token encoding/decoding for asset IDs.
 * Obfuscates Immich UUIDs in public-facing URLs using AES encryption.
 *
 * Uses deterministic encryption (IV derived from asset ID) so the same
 * asset always produces the same token — essential for browser caching.
 */

import crypto from 'crypto';
import { getConfig } from './config';

let _key: Buffer | null = null;

function getKey(): Buffer {
    if (!_key) {
        const apiKey = getConfig().immich.apiKey;
        _key = crypto.createHash('sha256').update(apiKey).digest();
    }
    return _key;
}

/**
 * Encode an asset ID into an opaque URL-safe token.
 */
export function encodeAssetId(assetId: string): string {
    const key = getKey();
    // Deterministic IV from asset ID (same input → same token)
    const iv = crypto.createHash('md5').update(assetId).digest();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([
        cipher.update(assetId, 'utf8'),
        cipher.final(),
    ]);
    // Compact: base64url(iv + ciphertext)
    return Buffer.concat([iv, encrypted]).toString('base64url');
}

/**
 * Decode a token back into an asset ID.
 * Returns null if the token is invalid.
 */
export function decodeAssetId(token: string): string | null {
    try {
        const key = getKey();
        const data = Buffer.from(token, 'base64url');
        if (data.length < 17) return null; // iv(16) + at least 1 byte

        const iv = data.subarray(0, 16);
        const encrypted = data.subarray(16);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]).toString('utf8');

        // Validate it looks like a UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(decrypted) ? decrypted : null;
    } catch {
        return null;
    }
}
