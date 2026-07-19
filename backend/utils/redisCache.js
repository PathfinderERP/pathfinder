import redis from './redisClient.js';
import crypto from 'crypto';

/**
 * Generates a unique cache key based on the prefix and data object.
 * @param {string} prefix 
 * @param {object} data 
 * @returns {string}
 */
export const generateCacheKey = (prefix, data) => {
    const sortedData = Object.keys(data)
        .sort()
        .reduce((acc, key) => {
            acc[key] = data[key];
            return acc;
        }, {});
    
    const hash = crypto.createHash('md5').update(JSON.stringify(sortedData)).digest('hex');
    return `${prefix}:${hash}`;
};

/**
 * Gets data from Redis cache.
 * @param {string} key 
 * @returns {Promise<any|null>}
 */
export const getCache = async (key) => {
    try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Redis Get Cache Error:', error);
        return null;
    }
};

/**
 * Sets data in Redis cache with an optional TTL (in seconds).
 * @param {string} key 
 * @param {any} data 
 * @param {number} ttl Defaults to 3600 (1 hour)
 */
export const setCache = async (key, data, ttl = 3600) => {
    try {
        await redis.set(key, JSON.stringify(data), 'EX', ttl);
    } catch (error) {
        console.error('Redis Set Cache Error:', error);
    }
};

/**
 * Deletes a specific cache key.
 * @param {string} key 
 */
export const deleteCache = async (key) => {
    try {
        await redis.del(key);
    } catch (error) {
        console.error('Redis Delete Cache Error:', error);
    }
};

/**
 * Deletes all cache keys matching a pattern. Supports Redis Standalone and Cluster mode.
 * Uses SCAN instead of KEYS in standalone mode to avoid blocking the Redis server.
 * @param {string} pattern 
 */
export const clearCachePattern = async (pattern) => {
    try {
        let keys = [];
        if (redis.nodes && typeof redis.nodes === 'function') {
            // Cluster mode: scan all master nodes for keys using SCAN (non-blocking)
            const masters = redis.nodes('master');
            const keysPromises = masters.map(async (node) => {
                const found = [];
                let cursor = '0';
                do {
                    const [nextCursor, batch] = await node.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                    cursor = nextCursor;
                    found.push(...batch);
                } while (cursor !== '0');
                return found;
            });
            const results = await Promise.all(keysPromises.map(p => p.catch(() => [])));
            keys = Array.from(new Set(results.flat()));
        } else {
            // Standalone mode: use SCAN to avoid blocking Redis with KEYS on large keyspaces
            let cursor = '0';
            do {
                const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = nextCursor;
                keys.push(...batch);
            } while (cursor !== '0');
        }

        if (keys.length > 0) {
            // Delete in batches of 500 to avoid oversized DEL commands
            const BATCH_SIZE = 500;
            for (let i = 0; i < keys.length; i += BATCH_SIZE) {
                await redis.del(...keys.slice(i, i + BATCH_SIZE));
            }
        }
    } catch (error) {
        console.error('Redis Clear Cache Pattern Error:', error);
    }
};
