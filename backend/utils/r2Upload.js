import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../config/r2Config.js";
import multer from "multer";

const storage = multer.memoryStorage();
export const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
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
        console.warn(`R2_PUBLIC_URL missing. Using fallback: ${publicUrl}`);
    }

    const fileName = `${folder}/${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`;
    const uploadParams = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    try {
        console.log(`R2 Upload: Starting upload for ${fileName} to bucket ${process.env.R2_BUCKET_NAME}`);
        await s3Client.send(new PutObjectCommand(uploadParams));
        const finalUrl = `${publicUrl}/${fileName}`;
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
            const prefixes = ["employees/", "letters/", "regularization/", "posts/"];
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
            const prefixes = ["employees/", "letters/", "regularization/", "posts/"];
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

        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
        });

        // Sign for 1 hour
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return signedUrl;
    } catch (error) {
        console.error("Error signing URL:", error, "for URL:", fileUrl);
        return fileUrl;
    }
};
