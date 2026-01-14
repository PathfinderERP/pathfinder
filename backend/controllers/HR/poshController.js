import PoshComplaint from "../../models/HR/PoshComplaint.js";
import Employee from "../../models/HR/Employee.js";
import User from "../../models/User.js";
import s3Client from "../../config/r2Config.js";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSignedFileUrl } from "../../utils/r2Upload.js";

// Helper to upload file to R2 and return key
const uploadFileToR2 = async (file) => {
    const bucketName = process.env.R2_BUCKET_NAME || "erp-documents";
    const fileName = `posh/${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;

    await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
    }));
    return fileName;
};

// Create a new complaint
export const createComplaint = async (req, res) => {
    try {
        const { accused, centre, department, designation, complaintDetails } = req.body;
        const files = req.files || [];

        // Find complainant employee record
        const complainant = await Employee.findOne({ user: req.user.id });
        if (!complainant) {
            return res.status(404).json({ message: "Complainant employee record not found." });
        }

        const uploadedDocKeys = [];
        for (const file of files) {
            const key = await uploadFileToR2(file);
            uploadedDocKeys.push(key);
        }

        const newComplaint = new PoshComplaint({
            complainant: complainant._id,
            accused,
            centre,
            department,
            designation,
            complaintDetails,
            documents: uploadedDocKeys,
            status: "Pending"
        });

        await newComplaint.save();

        res.status(201).json({ message: "Complaint submitted successfully", complaint: newComplaint });

    } catch (error) {
        console.error("Create Complaint Error:", error);
        res.status(500).json({ message: "Server error during complaint submission." });
    }
};

// Get list of complaints (HR view)
export const getComplaints = async (req, res) => {
    try {
        // Optional: Filter by status or date
        const complaints = await PoshComplaint.find()
            .populate("complainant", "name employeeId profileImage")
            .populate("accused", "name employeeId profileImage")
            .populate("centre", "centreName") // CentreSchema uses centreName
            .populate("department", "departmentName")
            .populate("designation", "name") // Designation uses name field
            .sort({ createdAt: -1 });

        // Sign URLs for documents and profile images
        const bucketName = process.env.R2_BUCKET_NAME || "erp-documents";

        const enhancedComplaints = await Promise.all(complaints.map(async (comp) => {
            const docUrls = await Promise.all(comp.documents.map(async (key) => {
                const command = new GetObjectCommand({
                    Bucket: bucketName,
                    Key: key
                });
                return await getSignedUrl(s3Client, command, { expiresIn: 3600 * 24 });
            }));

            // Sign Profile Images
            let complainantImage = null;
            if (comp.complainant && comp.complainant.profileImage) {
                complainantImage = await getSignedFileUrl(comp.complainant.profileImage);
            }
            let accusedImage = null;
            if (comp.accused && comp.accused.profileImage) {
                accusedImage = await getSignedFileUrl(comp.accused.profileImage);
            }

            return {
                ...comp.toObject(),
                documents: docUrls,
                complainant: {
                    ...comp.complainant?.toObject(),
                    profileImage: complainantImage
                },
                accused: {
                    ...comp.accused?.toObject(),
                    profileImage: accusedImage
                }
            };
        }));

        res.status(200).json(enhancedComplaints);

    } catch (error) {
        console.error("Get Complaints Error:", error);
        res.status(500).json({ message: "Error fetching complaints." });
    }
};

// Update complaint (HR response)
export const updateComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, hrResponse } = req.body;

        const complaint = await PoshComplaint.findById(id);
        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        if (status) complaint.status = status;
        if (hrResponse) complaint.hrResponse = hrResponse;

        await complaint.save();
        res.status(200).json({ message: "Complaint updated", complaint });

    } catch (error) {
        console.error("Update Complaint Error:", error);
        res.status(500).json({ message: "Error updating complaint" });
    }
};

// Get employees for selection filtered by Centre, Dept, Desig
export const getEmployeesForSelection = async (req, res) => {
    try {
        const { centreId, departmentId, designationId } = req.query;

        const query = { status: "Active" }; // Only active employees
        if (centreId) query.primaryCentre = centreId; // Adjust if logic uses 'centres' array
        if (departmentId) query.department = departmentId;
        if (designationId) query.designation = designationId;

        // Exclude the current user (cannot complain against yourself? Optional logic)
        // const currentUserEmp = await Employee.findOne({ user: req.user.id });
        // if (currentUserEmp) query._id = { $ne: currentUserEmp._id };

        const employees = await Employee.find(query)
            .select("name employeeId profileImage")
            .sort({ name: 1 });

        // Sign profile images for display
        const bucketName = process.env.R2_BUCKET_NAME || "erp-documents";

        const employeesWithImages = await Promise.all(employees.map(async (emp) => {
            let imageUrl = null;
            if (emp.profileImage) {
                imageUrl = await getSignedFileUrl(emp.profileImage);
            }
            return {
                ...emp.toObject(),
                profileImage: imageUrl
            };
        }));

        res.status(200).json(employeesWithImages);

    } catch (error) {
        console.error("Get Employees Selection Error:", error);
        res.status(500).json({ message: "Error fetching employees" });
    }
};
