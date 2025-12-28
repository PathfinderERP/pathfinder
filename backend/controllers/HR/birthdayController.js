import Employee from "../../models/HR/Employee.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../../config/r2Config.js";

// Helper function to get signed URL for a file (Copied from employeeController for consistency)
const getSignedFileUrl = async (fileUrl) => {
    if (!fileUrl) return null;

    try {
        const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
        let key = "";

        if (publicUrl && fileUrl.startsWith(publicUrl)) {
            key = fileUrl.replace(`${publicUrl}/`, "");
        } else if (fileUrl.startsWith("undefined/")) {
            key = fileUrl.replace("undefined/", "");
        } else {
            // Check for various prefixes
            const empIndex = fileUrl.indexOf("employees/");
            const letterIndex = fileUrl.indexOf("letters/");

            if (empIndex !== -1) {
                key = fileUrl.substring(empIndex);
            } else if (letterIndex !== -1) {
                key = fileUrl.substring(letterIndex);
            } else if (fileUrl.startsWith("http")) {
                // It's a full URL but not ours (or we can't extract key), return as is
                return fileUrl;
            } else {
                // Assume it's a key if it doesn't look like a URL
                key = fileUrl;
            }
        }

        // Handle local uploads (legacy)
        if (key.includes("uploads/") && !key.startsWith("employees/")) {
            let cleanPath = key.replace(/\\/g, "/");
            if (cleanPath.startsWith("uploads/")) {
                cleanPath = cleanPath.replace("uploads/", "");
            }
            return `${process.env.BACKEND_URL || "http://127.0.0.1:5000"}/api/uploads/${cleanPath}`;
        }

        // Remove any query parameters from the key
        key = key.split('?')[0];

        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return signedUrl;
    } catch (error) {
        console.error("Error signing URL:", error, "for URL:", fileUrl);
        return fileUrl;
    }
};

// @desc    Get all active employees for birthday list
// @route   GET /api/hr/birthdays
// @access  Private
export const getBirthdayList = async (req, res) => {
    try {
        const employees = await Employee.find({ status: "Active" })
            .select("name dateOfBirth profileImage department designation primaryCentre email")
            .populate("department", "departmentName")
            .populate("designation", "name title")
            .populate("primaryCentre", "centreName location");

        // Process images with signed URLs
        const employeesWithImages = await Promise.all(employees.map(async (emp) => {
            const empObj = emp.toObject();
            if (empObj.profileImage) {
                empObj.profileImage = await getSignedFileUrl(empObj.profileImage);
            }
            return empObj;
        }));

        res.status(200).json(employeesWithImages);
    } catch (error) {
        console.error("Error fetching birthday list:", error);
        res.status(500).json({ message: "Server Error" });
    }
};
