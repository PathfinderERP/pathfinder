import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../config/r2Config.js";
import multer from "multer";

const storage = multer.memoryStorage();
export const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 1024 * 1024 } // 1TB limit
});

/**
 * Uploads a file to Cloudflare R2
 * @param {Object} file - The file object from multer
 * @param {String} folder - The folder path in the bucket
 * @returns {Promise<String>} - The public URL of the uploaded file
 */
export const uploadToR2 = async (file, folder = "general") => {
    if (!file) return null;

    let publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

    if (!publicUrl) {
        if (process.env.AccountID) {
            publicUrl = `https://pub-${process.env.AccountID}.r2.dev`;
        } else if (process.env.S3API) {
            const cleanEndpoint = process.env.S3API.replace(/\/telecalleraudio\/?$/, "").replace(/\/$/, "");
            publicUrl = `${cleanEndpoint}/${process.env.R2_BUCKET_NAME || 'telecalleraudio'}`;
        } else {
            publicUrl = "https://pub-3c9d12dd00618b00795184bc5ff0c333.r2.dev";
        }
        console.warn(`R2 Upload: R2_PUBLIC_URL missing. Using fallback: ${publicUrl}`);
    }

    // Sanitize filename more aggressively for mobile uploads
    const originalName = file.originalname || "image.jpg";
    const extension = originalName.split('.').pop();
    const cleanBaseName = originalName
        .split('.')[0]
        .replace(/[^a-zA-Z0-9]/g, '_') // Remove any non-alphanumeric chars
        .substring(0, 50); // Limit length

    const fileName = `${folder}/${Date.now()}_${cleanBaseName}.${extension}`;

    const bucketName = process.env.R2_BUCKET_NAME || "telecalleraudio";

    const uploadParams = {
        Bucket: bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
    };

    try {
        console.log(`R2 Upload: Starting upload for ${fileName} (${file.size || file.buffer?.length || 0} bytes) to bucket ${bucketName}`);
        
        const parallelUploads3 = new Upload({
            client: s3Client,
            params: uploadParams,
            queueSize: 4, // 4 concurrent parts
            partSize: 5 * 1024 * 1024, // 5MB part size
            leavePartsOnError: false,
        });

        await parallelUploads3.done();

        let finalUrl = `${publicUrl}/${fileName}`;
        console.log(`R2 Upload: Success. Clean URL: ${finalUrl}`);
        return finalUrl;
    } catch (error) {
        console.error("R2 Upload: Error:", error);
        throw new Error("File upload failed: " + error.message);
    }
};

/**
 * Deletes a file from Cloudflare R2
 * @param {String} fileUrl - The full URL of the file to delete
 */
export const deleteFromR2 = async (fileUrl) => {
    if (!fileUrl) return;

    try {
        const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
        let key = "";

        if (publicUrl && fileUrl.startsWith(publicUrl)) {
            key = fileUrl.replace(`${publicUrl}/`, "");
        } else {
            // Fallback: search for common prefixes to find the key
            const prefixes = ["employees/", "letters/", "regularization/", "posts/", "community/"];
            for (const prefix of prefixes) {
                const index = fileUrl.indexOf(prefix);
                if (index !== -1) {
                    key = fileUrl.substring(index);
                    break;
                }
            }
        }

        if (!key) return;

        const deleteParams = {
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key.split('?')[0], // Remove any query params
        };
        await s3Client.send(new DeleteObjectCommand(deleteParams));
    } catch (error) {
        console.error("Error deleting from R2:", error);
    }
};

/**
 * Extracts clean R2 object key from any URL (stripping expired query parameters)
 * @param {String} fileUrl
 * @returns {String} key
 */
export const extractR2Key = (fileUrl) => {
    if (!fileUrl) return "";

    let cleanUrl = String(fileUrl).split('?')[0];

    const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
    if (publicUrl && cleanUrl.startsWith(publicUrl)) {
        cleanUrl = cleanUrl.replace(`${publicUrl}/`, "");
    }

    // 1. Check known folder prefixes FIRST to extract exact clean key regardless of repeated bucket names
    const prefixes = [
        "employees/", "letters/", "regularization/", "posts/", "community/",
        "petty_cash/", "marketing_planner/", "campaigns/", "training/",
        "cheque/", "general/", "documents/", "photos/", "audio/", "recordings/"
    ];
    for (const prefix of prefixes) {
        const index = cleanUrl.indexOf(prefix);
        if (index !== -1) {
            return cleanUrl.substring(index);
        }
    }

    // 2. Fallback key extraction & stripping of all repeated bucket prefixes
    const bucketName = process.env.R2_BUCKET_NAME || "telecalleraudio";
    let key = cleanUrl;
    try {
        if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
            const parsed = new URL(cleanUrl);
            key = parsed.pathname.replace(/^\//, '');
        }
    } catch (e) { }

    while (key.startsWith(`${bucketName}/`) || key.startsWith("telecalleraudio/")) {
        if (key.startsWith(`${bucketName}/`)) {
            key = key.substring(bucketName.length + 1);
        } else if (key.startsWith("telecalleraudio/")) {
            key = key.substring("telecalleraudio/".length);
        }
    }

    return key;
};

/**
 * Generates a fresh signed URL for a file in R2 (resolves ExpiredRequest errors)
 * @param {String} fileUrl - The public URL, expired presigned URL, or key of the file
 * @returns {Promise<String>} - The fresh signed URL
 */
export const getSignedFileUrl = async (fileUrl) => {
    if (!fileUrl) return null;

    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
        console.warn("getSignedFileUrl: Missing R2 credentials, returning original URL");
        return fileUrl;
    }

    try {
        const primaryKey = extractR2Key(fileUrl);
        if (!primaryKey) return fileUrl;

        const bucketName = process.env.R2_BUCKET_NAME || "telecalleraudio";

        // Candidate keys to check in Cloudflare R2
        const candidates = [primaryKey];
        if (!primaryKey.startsWith("telecalleraudio/")) {
            candidates.push(`telecalleraudio/${primaryKey}`);
        }

        let validKey = primaryKey;

        // Verify which key actually exists in R2
        for (const candidateKey of candidates) {
            try {
                await s3Client.send(new HeadObjectCommand({
                    Bucket: bucketName,
                    Key: candidateKey,
                }));
                validKey = candidateKey;
                break;
            } catch (err) {
                // Key not found at candidateKey, try next candidate
            }
        }

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: validKey,
            ResponseContentDisposition: "inline",
        });

        // Sign freshly for 7 days (604800 seconds)
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 604800 });
        return signedUrl;
    } catch (error) {
        console.error("Error signing URL:", error, "for URL:", fileUrl);
        return fileUrl;
    }
};

/**
 * Generates a presigned PUT URL for direct client-to-R2 upload
 * @param {String} fileName - The name of the file
 * @param {String} fileType - MIME type of the file
 * @param {String} folder - Destination folder in bucket
 * @returns {Promise<Object>} - { uploadUrl, fileUrl, key }
 */
export const getPresignedUploadUrl = async (fileName, fileType, folder = "campaigns") => {
    try {
        let publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

        if (!publicUrl) {
            if (process.env.AccountID) {
                publicUrl = `https://pub-${process.env.AccountID}.r2.dev`;
            } else if (process.env.S3API) {
                publicUrl = `${process.env.S3API.replace(/\/$/, "")}/${process.env.R2_BUCKET_NAME || 'telecalleraudio'}`;
            } else {
                publicUrl = "https://pub-3c9d12dd00618b00795184bc5ff0c333.r2.dev";
            }
        }

        const originalName = fileName || "file.bin";
        const extension = originalName.split('.').pop();
        const cleanBaseName = originalName
            .split('.')[0]
            .replace(/[^a-zA-Z0-9]/g, '_')
            .substring(0, 50);

        const key = `${folder}/${Date.now()}_${cleanBaseName}.${extension}`;
        const bucketName = process.env.R2_BUCKET_NAME || "telecalleraudio";

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: fileType || 'application/octet-stream',
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        const finalUrl = `${publicUrl}/${key}`;

        return { uploadUrl, fileUrl: finalUrl, key };
    } catch (err) {
        console.error("Error in getPresignedUploadUrl:", err);
        throw new Error("Failed to generate presigned upload URL: " + err.message);
    }
};
