/**
 * Simple in-memory LRU cache for Immich API responses.
 * Avoids hammering the Immich server with identical requests.
 */

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

class MemoryCache {
    private store = new Map<string, CacheEntry<unknown>>();
    private maxEntries = 200;

    get<T>(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }

        return entry.data as T;
    }

    set<T>(key: string, data: T, ttlMs: number): void {
        // Evict oldest entries if at capacity
        if (this.store.size >= this.maxEntries) {
            const firstKey = this.store.keys().next().value;
            if (firstKey) this.store.delete(firstKey);
        }

        this.store.set(key, {
            data,
            expiresAt: Date.now() + ttlMs,
        });
    }

    clear(): void {
        this.store.clear();
    }
}

export const cache = new MemoryCache();
