import { clearCachePattern, closeRedis } from "./utils/redisCache.js";
import dotenv from "dotenv";
dotenv.config();

const run = async () => {
    try {
        await clearCachePattern("finance:*");
        await clearCachePattern("board:*");
        console.log("Redis cache cleared for finance and board reports.");
        await closeRedis();
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
