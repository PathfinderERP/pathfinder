import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from the root backend directory
dotenv.config({ path: path.join(__dirname, "../.env") });

console.log("R2 Config: Loading credentials...");
console.log("R2 Endpoint:", process.env.S3API);
console.log("R2 Bucket:", process.env.R2_BUCKET_NAME);
console.log("R2 Public URL:", process.env.R2_PUBLIC_URL);

// Validate critical credentials
if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    const errorMsg = "CRITICAL: R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY is missing/empty in environment!";
    console.error(errorMsg);
    // We strictly need these. Throwing error will stop the app/module load, which is better than broken uploads.
    // However, to avoid crashing existing running dev servers if they use partial configs, we might just log loudly.
    // But for this User's specific error, "non-empty Access Key", we must ensure it is present.
    // Let's fallback to strict check.
    if (process.env.NODE_ENV === 'production') {
        throw new Error(errorMsg);
    }
}

const s3Client = new S3Client({
    region: "us-east-1",
    endpoint: process.env.S3API,
    credentials: {
        accessKeyId: (process.env.R2_ACCESS_KEY_ID || "").trim(),
        secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || "").trim(),
    },
    forcePathStyle: true, // Specific for some R2 integrations to avoid DNS issues
});

export default s3Client;
