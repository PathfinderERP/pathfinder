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
 * Deletes all cache keys matching a pattern.
 * @param {string} pattern 
 */
export const clearCachePattern = async (pattern) => {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch (error) {
        console.error('Redis Clear Cache Pattern Error:', error);
    }
};
