import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../../config/r2Config.js";

/**
 * Generate a fresh presigned URL for an audio file
 * This solves the 403 Forbidden error when presigned URLs expire
 */
const getAudioUrl = async (req, res) => {
    try {
        // When using :key+ in the route, Express provides the key as an array
        let key = req.params.key;

        // If it's an array (from :key+), join it back into a path
        if (Array.isArray(key)) {
            key = key.join('/');
        }

        if (!key) {
            return res.status(400).json({ message: "Audio key is required" });
        }

        const bucketName = process.env.R2_BUCKET_NAME || "telecalleraudio";

        // Generate a fresh presigned URL valid for 1 hour
        const presignedUrl = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
                Bucket: bucketName,
                Key: decodeURIComponent(key)
            }),
            { expiresIn: 3600 } // 1 hour
        );

        res.status(200).json({ url: presignedUrl });
    } catch (error) {
        console.error("Error generating audio URL:", error);
        res.status(500).json({ message: "Failed to generate audio URL" });
    }
};

export default getAudioUrl;
