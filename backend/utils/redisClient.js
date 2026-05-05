import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL;
const useRedis = process.env.USE_REDIS === 'true';

let redis;

if (!useRedis) {
    console.log('Redis: Caching is DISABLED (USE_REDIS=false)');
    // Mock Redis object to prevent crashes in other files
    redis = {
        on: () => {},
        get: async () => null,
        set: async () => null,
        del: async () => null,
        keys: async () => [],
        status: 'disabled'
    };
} else {
    const redisOptions = {
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        connectTimeout: 5000, // 5 seconds timeout to prevent hanging locally
        maxRetriesPerRequest: 3,
    };

    // TLS settings for AWS ElastiCache (required for rediss://)
    const tlsOptions = (redisUrl && redisUrl.startsWith('rediss://')) ? {
        tls: { rejectUnauthorized: false }
    } : {};

    try {
        // If it's an AWS Cluster Configuration endpoint (contains 'clusterCfg'), use Redis.Cluster
        if (redisUrl && redisUrl.includes('clusterCfg')) {
            console.log('Redis: Initializing Cluster Mode...');
            redis = new Redis.Cluster([redisUrl], {
                enableOfflineQueue: false, // Don't queue commands if connection fails
                clusterRetryStrategy: (times) => {
                    const delay = Math.min(times * 100, 3000);
                    return delay;
                },
                redisOptions: {
                    ...redisOptions,
                    ...tlsOptions
                },
                // dnsLookup is often needed for AWS internal endpoints
                dnsLookup: (address, callback) => callback(null, address),
            });
        } else if (redisUrl) {
            console.log('Redis: Initializing Standalone/External Mode...');
            redis = new Redis(redisUrl, {
                ...redisOptions,
                ...tlsOptions,
                enableOfflineQueue: false
            });
        } else {
            console.log('Redis: Using local configuration...');
            redis = new Redis({
                host: process.env.REDIS_HOST || '127.0.0.1',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
                ...redisOptions,
                enableOfflineQueue: false
            });
        }
    } catch (error) {
        console.error('Redis: Initialization failed:', error.message);
    }

    redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
    });

    redis.on('error', (err) => {
        // This logs the timeout but prevents the process from crashing
        console.error('❌ Redis connection error:', err.message);
    });
}

export default redis;
