import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load env
const loadEnv = () => {
    // Try standard loading
    dotenv.config();

    // Explicit fallback to backend root .env
    const rootEnvPath = path.join(__dirname, "../.env");
    const result = dotenv.config({ path: rootEnvPath });

    if (result.error) {
        // console.warn("R2 Config: Could not load .env from", rootEnvPath);
    }
};

loadEnv();

const r2AccessKeyId = (process.env.R2_ACCESS_KEY_ID || "").trim();
const r2SecretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
const r2Endpoint = (process.env.S3API || "").trim();
const r2Bucket = (process.env.R2_BUCKET_NAME || "").trim();

// console.log("--- R2 CONFIG DEBUG ---");
// console.log("Endpoint:", r2Endpoint);
// console.log("Bucket:", r2Bucket);
// console.log("AccessKeyId Length:", r2AccessKeyId.length);
// console.log("SecretAccessKey Length:", r2SecretAccessKey.length);

if (!r2AccessKeyId || !r2SecretAccessKey) {
    console.error("CRITICAL ERROR: R2 Credentials missing in r2Config.js");
}

const s3Client = new S3Client({
    region: "auto",
    endpoint: r2Endpoint,
    credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
    },
    forcePathStyle: true, // Required for R2
});

export default s3Client;
