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
if (!process.env.R2_ACCESS_KEY_ID) {
    console.warn("WARNING: R2_ACCESS_KEY_ID is missing from environment variables!");
}

const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.S3API,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
});

export default s3Client;
