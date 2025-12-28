import Training from "../../models/HR/Training.js";
import Employee from "../../models/HR/Employee.js";
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../../config/r2Config.js";
import dotenv from "dotenv";

dotenv.config();

// Helper to generate signed URL
const getSignedDownloadUrl = async (key, originalFileName, forceDownload = false) => {
    if (!key) return null;
    try {
        let cleanKey = key;
        if (key.includes(".dev/")) {
            cleanKey = key.split(".dev/")[1];
        } else if (key.includes("cloudflarestorage.com/")) {
            const parts = key.split("cloudflarestorage.com/");
            if (parts.length > 1) {
                const pathParts = parts[1].split("/");
                if (pathParts[0] === process.env.R2_BUCKET_NAME) {
                    cleanKey = pathParts.slice(1).join("/");
                } else {
                    cleanKey = pathParts.join("/");
                }
            }
        }

        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: cleanKey,
            ResponseContentDisposition: forceDownload && originalFileName
                ? `attachment; filename="${originalFileName}"`
                : `inline`
        });

        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch (error) {
        console.error("Signed URL Error:", error);
        return key;
    }
};

const uploadToR2 = async (file, folder = "training") => {
    if (!file) return null;
    const fileName = `${folder}/${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`;
    const uploadParams = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
    };
    try {
        await s3Client.send(new PutObjectCommand(uploadParams));
        return fileName;
    } catch (error) {
        console.error("R2 Upload Error:", error);
        throw new Error("File upload failed");
    }
};

const deleteFromR2 = async (fileKey) => {
    if (!fileKey) return;
    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey
        }));
    } catch (error) {
        console.error("R2 Delete Error:", error);
    }
};

const determineFileType = (mimetype) => {
    if (mimetype.startsWith("video/")) return "Video";
    if (mimetype === "application/pdf") return "PDF";
    if (mimetype.startsWith("image/")) return "Image";
    return "Other";
};

export const createTraining = async (req, res) => {
    try {
        const { title, description, category, visibility, assignedTo } = req.body;
        const files = req.files || [];

        if (files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }

        const uploadedFiles = await Promise.all(files.map(async (file) => {
            const key = await uploadToR2(file);
            return {
                fileKey: key,
                fileName: file.originalname,
                fileSize: file.size,
                fileType: determineFileType(file.mimetype)
            };
        }));

        const training = new Training({
            title,
            description,
            category,
            visibility,
            assignedTo: visibility === "Specific" ? JSON.parse(assignedTo || "[]") : [],
            uploadedBy: req.user.id,
            files: uploadedFiles
        });

        await training.save();
        res.status(201).json({ message: "Training materials uploaded successfully", training });
    } catch (error) {
        console.error("Create Training Error:", error);
        res.status(500).json({ message: "Error uploading training", error: error.message });
    }
};

export const getHRTrainings = async (req, res) => {
    try {
        const trainings = await Training.find()
            .populate("assignedTo", "name employeeId")
            .sort({ createdAt: -1 });

        const listWithUrls = await Promise.all(trainings.map(async (t) => {
            const doc = t.toObject();
            doc.files = await Promise.all(doc.files.map(async (f) => {
                f.fileUrl = await getSignedDownloadUrl(f.fileKey, f.fileName, false);
                f.downloadUrl = await getSignedDownloadUrl(f.fileKey, f.fileName, true);
                return f;
            }));
            return doc;
        }));

        res.status(200).json(listWithUrls);
    } catch (error) {
        res.status(500).json({ message: "Error fetching training list", error: error.message });
    }
};

export const getMyTrainings = async (req, res) => {
    try {
        const employee = await Employee.findOne({ user: req.user.id });
        if (!employee) return res.status(404).json({ message: "Employee profile not found" });

        const trainings = await Training.find({
            $or: [
                { visibility: "All" },
                { assignedTo: employee._id }
            ]
        }).sort({ createdAt: -1 });

        const listWithUrls = await Promise.all(trainings.map(async (t) => {
            const doc = t.toObject();
            doc.files = await Promise.all(doc.files.map(async (f) => {
                f.fileUrl = await getSignedDownloadUrl(f.fileKey, f.fileName, false);
                f.downloadUrl = await getSignedDownloadUrl(f.fileKey, f.fileName, true);
                return f;
            }));
            return doc;
        }));

        res.status(200).json(listWithUrls);
    } catch (error) {
        res.status(500).json({ message: "Error fetching training list", error: error.message });
    }
};

export const deleteTraining = async (req, res) => {
    try {
        const training = await Training.findById(req.params.id);
        if (!training) return res.status(404).json({ message: "Training not found" });

        await Promise.all(training.files.map(f => deleteFromR2(f.fileKey)));
        await Training.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: "Training materials deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting training", error: error.message });
    }
};

export const updateTraining = async (req, res) => {
    try {
        const { title, description, category, visibility, assignedTo } = req.body;
        const training = await Training.findById(req.params.id);
        if (!training) return res.status(404).json({ message: "Training not found" });

        const updateData = {
            title,
            description,
            category,
            visibility,
            assignedTo: visibility === "Specific" ? JSON.parse(assignedTo || "[]") : []
        };

        if (req.files && req.files.length > 0) {
            // Delete old files
            await Promise.all(training.files.map(f => deleteFromR2(f.fileKey)));

            // Upload new files
            const newFiles = await Promise.all(req.files.map(async (file) => {
                const key = await uploadToR2(file);
                return {
                    fileKey: key,
                    fileName: file.originalname,
                    fileSize: file.size,
                    fileType: determineFileType(file.mimetype)
                };
            }));
            updateData.files = newFiles;
        }

        const updated = await Training.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.status(200).json({ message: "Training updated", training: updated });
    } catch (error) {
        res.status(500).json({ message: "Error updating training", error: error.message });
    }
};
