import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../../config/r2Config.js";
import LeadManagement from "../../models/LeadManagement.js";
import crypto from "crypto";

const uploadRecording = async (req, res) => {
    try {
        const { leadId } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const lead = await LeadManagement.findById(leadId);
        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        const bucketName = process.env.R2_BUCKET_NAME || "telecalleraudio";
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `${leadId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${fileExtension}`;
        const key = `recordings/${fileName}`;

        // 1. Upload the file
        const uploadParams = {
            Bucket: bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        // 2. Generate a Presigned URL for playing the audio
        // Note: Presigned URLs are temporary. For a more permanent solution, 
        // a public bucket or custom domain is needed. 
        // Setting expiry to 7 days (max allowed for S3 standard)
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 604800 });

        lead.recordings.push({
            audioUrl: presignedUrl,
            fileName: file.originalname,
            uploadedBy: req.user?.name || "Telecaller",
        });

        await lead.save();

        res.status(200).json({
            message: "Recording uploaded successfully",
            recording: lead.recordings[lead.recordings.length - 1]
        });

    } catch (error) {
        console.error("Error uploading recording:", error);
        res.status(500).json({ message: "Error uploading recording", error: error.message });
    }
};

export default uploadRecording;
