import Reimbursement from "../../models/HR/Reimbursement.js";
import Employee from "../../models/HR/Employee.js";
import { getSignedFileUrl } from "../../utils/r2Upload.js";

// Helper to handle local vs R2 URLs
const getLocalOrSignedUrl = async (path, req) => {
    if (!path) return null;
    const normalized = path.replace(/\\/g, "/");
    // If it looks like a local upload
    if (normalized.startsWith("uploads/")) {
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        return `${baseUrl}/api/${normalized}`;
    }
    return await getSignedFileUrl(path);
};

// Submit Reimbursement (Employee)
export const submitReimbursement = async (req, res) => {
    try {
        const {
            purpose, travelType, travelMode,
            fromDate, toDate, allowanceType,
            amount, description
        } = req.body;

        const employee = await Employee.findOne({ user: req.user.id });
        if (!employee) {
            return res.status(404).json({ message: "Employee profile not found" });
        }

        const reimbursement = new Reimbursement({
            employee: employee._id,
            purpose,
            travelType,
            travelMode,
            fromDate,
            toDate,
            allowanceType,
            amount,
            description,
            proof: req.file ? req.file.path : null
        });

        await reimbursement.save();
        res.status(201).json({ message: "Reimbursement submitted successfully", reimbursement });
    } catch (error) {
        console.error("Submit Reimbursement Error:", error);
        res.status(500).json({ message: "Error submitting reimbursement" });
    }
};

// Get My Reimbursements (Employee)
export const getMyReimbursements = async (req, res) => {
    try {
        const { fromDate, toDate, status } = req.query;
        let query = {};

        const employee = await Employee.findOne({ user: req.user.id });
        if (!employee) {
            return res.status(404).json({ message: "Employee profile not found" });
        }

        query.employee = employee._id;

        if (status && status !== "All Status") {
            query.status = status;
        }

        if (fromDate && toDate) {
            query.createdAt = {
                $gte: new Date(fromDate),
                $lte: new Date(toDate)
            };
        }

        const reimbursements = await Reimbursement.find(query)
            .sort({ createdAt: -1 });

        // Generate URLs
        const enriched = await Promise.all(reimbursements.map(async (r) => {
            const obj = r.toObject();
            if (obj.proof) {
                obj.proofUrl = await getLocalOrSignedUrl(obj.proof, req);
            }
            return obj;
        }));

        res.status(200).json(enriched);
    } catch (error) {
        console.error("Get My Reimbursements Error:", error);
        res.status(500).json({ message: "Error fetching reimbursements" });
    }
};

// Get All Reimbursements (HR) - With Filters
export const getAllReimbursements = async (req, res) => {
    try {
        const { fromDate, toDate, status } = req.query;
        let query = {};

        if (status && status !== "All Status") {
            query.status = status;
        }

        if (fromDate && toDate) {
            query.createdAt = {
                $gte: new Date(fromDate),
                $lte: new Date(toDate)
            };
        }

        const reimbursements = await Reimbursement.find(query)
            .populate("employee", "name employeeId profileImage department")
            .sort({ createdAt: -1 });

        const enriched = await Promise.all(reimbursements.map(async (r) => {
            const obj = r.toObject();
            // Employee profile images are likely R2, so use getSignedFileUrl directly (or employeeController logic handles it)
            if (obj.employee && obj.employee.profileImage) {
                obj.employee.profileImage = await getSignedFileUrl(obj.employee.profileImage);
            }
            // Proof documents use our new helper
            if (obj.proof) {
                obj.proofUrl = await getLocalOrSignedUrl(obj.proof, req);
            }
            return obj;
        }));

        res.status(200).json(enriched);
    } catch (error) {
        console.error("Get All Reimbursements Error:", error);
        res.status(500).json({ message: "Error fetching reimbursements" });
    }
};

// Get Single Reimbursement
export const getReimbursementById = async (req, res) => {
    try {
        const reimbursement = await Reimbursement.findById(req.params.id)
            .populate("employee", "name employeeId department");

        if (!reimbursement) {
            return res.status(404).json({ message: "Reimbursement not found" });
        }

        const obj = reimbursement.toObject();
        if (obj.proof) {
            obj.proofUrl = await getLocalOrSignedUrl(obj.proof, req);
        }

        res.status(200).json(obj);
    } catch (error) {
        console.error("Get Reimbursement By Id Error:", error);
        res.status(500).json({ message: "Error fetching reimbursement" });
    }
};

// Update Reimbursement (HR Edit/Approve)
export const updateReimbursement = async (req, res) => {
    try {
        const { status, approvedBy, ...updateData } = req.body;

        let updateFields = { ...updateData };
        if (req.file) {
            updateFields.proof = req.file.path;
        }

        // Only HR/Admin can update status
        if (status) {
            updateFields.status = status;
            if (status === "Approved" || status === "Rejected") {
                updateFields.approvedBy = req.user.id;
            }
        }

        const reimbursement = await Reimbursement.findByIdAndUpdate(
            req.params.id,
            updateFields,
            { new: true }
        );

        if (!reimbursement) {
            return res.status(404).json({ message: "Reimbursement not found" });
        }

        res.status(200).json({ message: "Reimbursement updated", reimbursement });
    } catch (error) {
        console.error("Update Reimbursement Error:", error);
        res.status(500).json({ message: "Error updating reimbursement" });
    }
};

// Delete Reimbursement
export const deleteReimbursement = async (req, res) => {
    try {
        const reimbursement = await Reimbursement.findByIdAndDelete(req.params.id);
        if (!reimbursement) {
            return res.status(404).json({ message: "Reimbursement not found" });
        }
        res.status(200).json({ message: "Reimbursement deleted" });
    } catch (error) {
        console.error("Delete Reimbursement Error:", error);
        res.status(500).json({ message: "Error deleting reimbursement" });
    }
};
