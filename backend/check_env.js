import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading default .env
dotenv.config();

console.log("Checking Environment Variables...");
console.log("Current Directory:", process.cwd());
console.log("__dirname:", __dirname);

const keys = [
    "R2_BUCKET_NAME",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_PUBLIC_URL",
    "S3API"
];

keys.forEach(key => {
    const val = process.env[key];
    if (val) {
        console.log(`${key}: SET (Length: ${val.length})`);
        if (key === "R2_ACCESS_KEY_ID") {
            console.log(`First 3 chars of ID: ${val.substring(0, 3)}`);
        }
    } else {
        console.log(`${key}: MISSING or EMPTY`);
    }
});
