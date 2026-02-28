import Employee from "../../models/HR/Employee.js";
import pdfGenerator from "../../utils/pdfGenerator/index.js";
import emailService from "../../utils/emailService.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../../config/r2Config.js";
import { signEmployeeFiles } from "./employeeController.js";
import { getSignedFileUrl } from "../../utils/r2Upload.js";
import { getUploadDir } from "../../utils/pdfGenerator/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadToR2 = async (filePath, folder = "letters") => {
    if (!fs.existsSync(filePath)) return null;

    try {
        const fileContent = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        const r2Key = `${folder}/${fileName}`;
        const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

        const uploadParams = {
            Bucket: process.env.R2_BUCKET_NAME,
            Key: r2Key,
            Body: fileContent,
            ContentType: "application/pdf",
        };

        console.log(`R2 Upload: Starting upload for ${r2Key} to bucket ${process.env.R2_BUCKET_NAME}`);
        await s3Client.send(new PutObjectCommand(uploadParams));

        // Always delete local file after upload (especially since we use temp dir)
        fs.unlinkSync(filePath);

        // Return R2 URL - if publicUrl is missing, we use a virtual 'undefined/' prefix
        // which getSignedFileUrl knows how to handle.
        const finalUrl = publicUrl ? `${publicUrl}/${r2Key}` : `${r2Key}`;
        return finalUrl;
    } catch (error) {
        console.error("R2 Upload Error:", error);
        // Clean up even on error if it's in temp
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return null;
    }
};

// Helper function to save letter to employee history
const saveLetterToHistory = async (employeeId, letterType, fileName, fileUrl) => {
    try {
        await Employee.findByIdAndUpdate(employeeId, {
            $push: {
                letters: {
                    letterType,
                    fileName,
                    fileUrl,
                    generatedAt: new Date()
                }
            }
        });
    } catch (error) {
        console.error("Error saving letter to history:", error);
    }
};

// Helper function to handle common letter generation logic
const handleGenerateLetter = async (req, res, letterType, generatorFunc, dataMapper) => {
    try {
        const { id } = req.params;
        const employeeRaw = await Employee.findById(id)
            .populate("designation")
            .populate("department")
            .populate("primaryCentre");
        if (!employeeRaw) return res.status(404).json({ message: "Employee not found" });

        // Sign file URLs (crucial for profile image in Virtual ID)
        const employee = await signEmployeeFiles(employeeRaw);

        const data = dataMapper(employee, req.body);

        // Handle Signature Image (could be base64 from HR drag & drop)
        if (req.body.signatureImage && req.body.signatureImage.startsWith("data:image")) {
            const base64Data = req.body.signatureImage.replace(/^data:image\/\w+;base64,/, "");
            data.signatureImage = Buffer.from(base64Data, 'base64');
        } else if (req.body.signatureImage) {
            data.signatureImage = req.body.signatureImage; // Already a URL or path
        }

        const { filePath, fileName } = await generatorFunc(employee, data);
        const finalUrl = await uploadToR2(filePath);
        if (finalUrl) {
            await saveLetterToHistory(id, letterType, fileName, finalUrl);
        } else {
            console.error(`Failed to upload ${letterType} to R2`);
        }

        // Sign the URL for frontend preview
        const signedUrl = await getSignedFileUrl(finalUrl);

        res.json({ message: `${letterType} generated successfully`, fileName, filePath: signedUrl });
    } catch (error) {
        console.error(`Error:`, error);
        res.status(500).json({ message: `Error generating ${letterType}` });
    }
};

export const generateOfferLetter = (req, res) => handleGenerateLetter(req, res, "Offer Letter", pdfGenerator.generateOfferLetter.bind(pdfGenerator), (emp, body) => ({
    companyName: body.companyName || "PathFinder ERP",
    joiningDate: body.joiningDate || emp.joiningDate,
    manualContent: body.manualContent || ""
}));
export const generateAppointmentLetter = (req, res) => handleGenerateLetter(req, res, "Appointment Letter", pdfGenerator.generateAppointmentLetter.bind(pdfGenerator), (emp, body) => ({ companyName: body.companyName || "PathFinder ERP" }));
export const generateContractLetter = (req, res) => handleGenerateLetter(req, res, "Contract Letter", pdfGenerator.generateContractLetter.bind(pdfGenerator), (emp, body) => ({ companyName: body.companyName || "PathFinder ERP" }));
export const generateExperienceLetter = (req, res) => handleGenerateLetter(req, res, "Experience Letter", pdfGenerator.generateExperienceLetter.bind(pdfGenerator), (emp, body) => ({ companyName: body.companyName || "PathFinder ERP", relievingDate: body.relievingDate }));
export const generateReleaseLetter = (req, res) => handleGenerateLetter(req, res, "Release Letter", pdfGenerator.generateReleaseLetter.bind(pdfGenerator), (emp, body) => ({ companyName: body.companyName || "PathFinder ERP", relievingDate: body.relievingDate || new Date().toISOString().split("T")[0] }));
export const generateVirtualId = (req, res) => handleGenerateLetter(req, res, "Virtual ID", pdfGenerator.generateVirtualId.bind(pdfGenerator), (emp, body) => ({ companyName: body.companyName || "PathFinder ERP" }));

// Send Letters
const handleSendLetter = async (req, res, mailFunc) => {
    try {
        const { id } = req.params;
        const { fileName, customSubject, customBody, additionalAttachments, cc, bcc } = req.body;
        console.log(`Sending letter for Employee ID: ${id}, FileName: ${fileName}`);

        const employee = await Employee.findById(id);
        if (!employee) {
            console.error(`Employee not found: ${id}`);
            return res.status(404).json({ message: "Employee not found" });
        }

        const r2Key = `letters/${fileName}`;
        const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

        // Use signed URL for the attachment (Nodemailer can fetch from URL)
        const finalUrl = publicUrl ? `${publicUrl}/${r2Key}` : `${r2Key}`;
        const attachmentPath = await getSignedFileUrl(finalUrl);

        console.log(`Attachment URL resolved to: ${attachmentPath}`);

        if (customSubject || customBody || (additionalAttachments && additionalAttachments.length > 0)) {
            // Process additional attachments if they are base64
            const processedAttachments = (additionalAttachments || []).map(attr => {
                if (attr.content && attr.content.startsWith("data:")) {
                    const base64Data = attr.content.replace(/^data:.*;base64,/, "");
                    return {
                        filename: attr.filename,
                        content: Buffer.from(base64Data, 'base64')
                    };
                }
                return attr;
            });

            await emailService.sendCustomLetter(employee, {
                subject: customSubject,
                body: customBody,
                cc: cc,
                bcc: bcc,
                mainAttachment: {
                    filename: fileName,
                    path: attachmentPath
                },
                additionalAttachments: processedAttachments
            });
        } else {
            await mailFunc(employee, attachmentPath);
        }

        res.json({ message: "Sent successfully" });
    } catch (error) {
        console.error("Error in handleSendLetter:", error);
        res.status(500).json({ message: "Error sending email", error: error.message });
    }
};

export const sendOfferLetter = (req, res) => handleSendLetter(req, res, emailService.sendOfferLetter.bind(emailService));
export const sendAppointmentLetter = (req, res) => handleSendLetter(req, res, emailService.sendAppointmentLetter.bind(emailService));
export const sendContractLetter = (req, res) => handleSendLetter(req, res, emailService.sendContractLetter.bind(emailService));
export const sendExperienceLetter = (req, res) => handleSendLetter(req, res, emailService.sendExperienceLetter.bind(emailService));
export const sendReleaseLetter = (req, res) => handleSendLetter(req, res, emailService.sendReleaseLetter.bind(emailService));
export const sendVirtualId = (req, res) => handleSendLetter(req, res, emailService.sendVirtualId.bind(emailService));

export const downloadLetter = async (req, res) => {
    try {
        const { fileName } = req.params;
        const r2Key = `letters/${fileName}`;
        const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

        // Use signed URL for the download redirect
        const finalUrl = publicUrl ? `${publicUrl}/${r2Key}` : `${r2Key}`;
        const signedUrl = await getSignedFileUrl(finalUrl);

        return res.redirect(signedUrl);
    } catch (error) {
        res.status(500).send("Error");
    }
};

export const deleteLetter = async (req, res) => {
    try {
        const { employeeId, letterId } = req.params;

        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ message: "Employee not found" });

        const letterIndex = employee.letters.findIndex(l => l._id.toString() === letterId);
        if (letterIndex === -1) return res.status(404).json({ message: "Letter not found" });

        const letter = employee.letters[letterIndex];
        const fileName = letter.fileName;

        // 1. Delete from R2
        try {
            const deleteParams = {
                Bucket: process.env.R2_BUCKET_NAME,
                Key: `letters/${fileName}`,
            };
            await s3Client.send(new DeleteObjectCommand(deleteParams));
            console.log(`R2: Deleted file letters/${fileName}`);
        } catch (r2Error) {
            console.error("R2 Delete Error (skipping):", r2Error);
        }

        // 2. Remove from Database
        employee.letters.splice(letterIndex, 1);
        await employee.save();

        res.json({ message: "Letter deleted successfully" });
    } catch (error) {
        console.error("Error deleting letter:", error);
        res.status(500).json({ message: "Error deleting letter", error: error.message });
    }
};
