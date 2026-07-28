import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
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
            publicUrl = `${process.env.S3API.replace(/\/$/, "")}/${process.env.R2_BUCKET_NAME}`;
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

        let finalUrl;
        try {
            finalUrl = await getSignedUrl(
                s3Client,
                new GetObjectCommand({ Bucket: bucketName, Key: fileName }),
                { expiresIn: 604800 }
            );
        } catch (e) {
            finalUrl = `${publicUrl}/${fileName}`;
        }
        console.log(`R2 Upload: Success. URL: ${finalUrl}`);
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
 * Generates a signed URL for a file in R2
 * @param {String} fileUrl - The public URL or key of the file
 * @returns {Promise<String>} - The signed URL
 */
export const getSignedFileUrl = async (fileUrl) => {
    if (!fileUrl) return null;

    if (fileUrl.includes("X-Amz-Signature") || fileUrl.includes("X-Amz-Algorithm")) {
        return fileUrl;
    }

    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
        console.warn("getSignedFileUrl: Missing R2 credentials, returning original URL");
        return fileUrl;
    }

    try {
        const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
        let key = "";

        if (publicUrl && fileUrl.startsWith(publicUrl)) {
            key = fileUrl.replace(`${publicUrl}/`, "");
        } else {
            const prefixes = ["employees/", "letters/", "regularization/", "posts/", "community/", "petty_cash/", "marketing_planner/", "campaigns/"];
            for (const prefix of prefixes) {
                const index = fileUrl.indexOf(prefix);
                if (index !== -1) {
                    key = fileUrl.substring(index);
                    break;
                }
            }

            if (!key) return fileUrl;
        }

        key = key.split('?')[0];

        const bucketName = process.env.R2_BUCKET_NAME || "telecalleraudio";

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
            ResponseContentDisposition: "inline",
        });

        // Sign for 7 days (604800 seconds)
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
    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.S3API) {
        throw new Error("R2 S3 credentials or S3API endpoint not configured on server");
    }

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
