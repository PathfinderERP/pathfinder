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

const defaultEndpoint = "https://3c9d12dd00618b00795184bc5ff0c333.r2.cloudflarestorage.com";
let rawEndpoint = (process.env.S3API || defaultEndpoint).trim();
// Strip trailing bucket name or slash from S3API endpoint (e.g. /telecalleraudio) to avoid duplicate paths in AWS S3Client
const r2Endpoint = rawEndpoint.replace(/\/telecalleraudio\/?$/, "").replace(/\/$/, "");
const r2AccessKeyId = (process.env.R2_ACCESS_KEY_ID || "").trim();
const r2SecretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
const r2Bucket = (process.env.R2_BUCKET_NAME || "telecalleraudio").trim();

if (!r2AccessKeyId || !r2SecretAccessKey) {
    console.warn("R2 Config: R2 Credentials missing or using default fallback in r2Config.js");
}

const s3Client = new S3Client({
    region: "auto",
    endpoint: r2Endpoint,
    credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
    },
    forcePathStyle: true, // Required for R2
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED"
});

export default s3Client;
