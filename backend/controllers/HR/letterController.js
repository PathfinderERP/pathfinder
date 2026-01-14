import Employee from "../../models/HR/Employee.js";
import pdfGenerator from "../../utils/pdfGenerator/index.js";
import emailService from "../../utils/emailService.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PutObjectCommand } from "@aws-sdk/client-s3";
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
        const finalUrl = publicUrl ? `${publicUrl}/${r2Key}` : `undefined/${r2Key}`;
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

// Generate Offer Letter
export const generateOfferLetter = async (req, res) => {
    try {
        const { id } = req.params;
        const employeeRaw = await Employee.findById(id)
            .populate("designation")
            .populate("department")
            .populate("primaryCentre");

        if (!employeeRaw) return res.status(404).json({ message: "Employee not found" });

        // Sign file URLs
        const employee = await signEmployeeFiles(employeeRaw);

        const data = {
            companyName: req.body.companyName || "PathFinder ERP",
            joiningDate: req.body.joiningDate || employee.joiningDate
        };

        const { filePath, fileName } = await pdfGenerator.generateOfferLetter(employee, data);
        const finalUrl = await uploadToR2(filePath);
        await saveLetterToHistory(id, "Offer Letter", fileName, finalUrl);

        // Sign the URL for frontend preview
        const signedUrl = await getSignedFileUrl(finalUrl);

        res.json({
            message: "Offer letter generated successfully",
            fileName,
            filePath: signedUrl
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Error generating offer letter", error: error.message });
    }
};

// ... Similar logic for other letters ...
// Using helper to refactor the rest
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
        const { filePath, fileName } = await generatorFunc(employee, data);
        const finalUrl = await uploadToR2(filePath);
        await saveLetterToHistory(id, letterType, fileName, finalUrl);

        // Sign the URL for frontend preview
        const signedUrl = await getSignedFileUrl(finalUrl);

        res.json({ message: `${letterType} generated successfully`, fileName, filePath: signedUrl });
    } catch (error) {
        console.error(`Error:`, error);
        res.status(500).json({ message: `Error generating ${letterType}` });
    }
};

export const generateAppointmentLetter = (req, res) => handleGenerateLetter(req, res, "Appointment Letter", pdfGenerator.generateAppointmentLetter.bind(pdfGenerator), (emp, body) => ({ companyName: body.companyName || "PathFinder ERP" }));
export const generateContractLetter = (req, res) => handleGenerateLetter(req, res, "Contract Letter", pdfGenerator.generateContractLetter.bind(pdfGenerator), (emp, body) => ({ companyName: body.companyName || "PathFinder ERP" }));
export const generateExperienceLetter = (req, res) => handleGenerateLetter(req, res, "Experience Letter", pdfGenerator.generateExperienceLetter.bind(pdfGenerator), (emp, body) => ({ companyName: body.companyName || "PathFinder ERP", relievingDate: body.relievingDate }));
export const generateReleaseLetter = (req, res) => handleGenerateLetter(req, res, "Release Letter", pdfGenerator.generateReleaseLetter.bind(pdfGenerator), (emp, body) => ({ companyName: body.companyName || "PathFinder ERP", relievingDate: body.relievingDate || new Date().toISOString().split("T")[0] }));
export const generateVirtualId = (req, res) => handleGenerateLetter(req, res, "Virtual ID", pdfGenerator.generateVirtualId.bind(pdfGenerator), (emp, body) => ({ companyName: body.companyName || "PathFinder ERP" }));

// Send Letters
const handleSendLetter = async (req, res, mailFunc) => {
    try {
        const { id } = req.params;
        const { fileName } = req.body;
        const employee = await Employee.findById(id);
        if (!employee) return res.status(404).json({ message: "Employee not found" });

        const r2Key = `letters/${fileName}`;
        const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

        // Use signed URL for the attachment (Nodemailer can fetch from URL)
        const finalUrl = publicUrl ? `${publicUrl}/${r2Key}` : `undefined/${r2Key}`;
        const attachmentPath = await getSignedFileUrl(finalUrl);

        await mailFunc(employee, attachmentPath);
        res.json({ message: "Sent successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error sending email" });
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
        const finalUrl = publicUrl ? `${publicUrl}/${r2Key}` : `undefined/${r2Key}`;
        const signedUrl = await getSignedFileUrl(finalUrl);

        return res.redirect(signedUrl);
    } catch (error) {
        res.status(500).send("Error");
    }
};
