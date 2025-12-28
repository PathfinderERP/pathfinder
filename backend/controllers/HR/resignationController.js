import ResignationRequest from "../../models/HR/ResignationRequest.js";
import Employee from "../../models/HR/Employee.js";
import { getSignedFileUrl } from "./employeeController.js";

// Submit a resignation request
export const submitResignation = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ message: "Reason for resignation is required." });
        }

        const employee = await Employee.findOne({ user: userId });
        if (!employee) {
            return res.status(404).json({ message: "Employee profile not found." });
        }

        // Check if a request already exists
        const existingRequest = await ResignationRequest.findOne({ user: userId, status: "Pending" });
        if (existingRequest) {
            return res.status(400).json({ message: "You already have a pending resignation request." });
        }

        const request = new ResignationRequest({
            employeeId: employee._id,
            user: userId,
            reason
        });

        await request.save();
        res.status(201).json({ message: "Resignation request submitted successfully.", request });
    } catch (error) {
        console.error("Resignation Submit Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get employee's own resignation status
export const getMyResignationStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const request = await ResignationRequest.findOne({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json(request);
    } catch (error) {
        console.error("Get Resignation Status Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// HR: Get all resignation requests
export const getAllResignationRequests = async (req, res) => {
    try {
        const requests = await ResignationRequest.find()
            .populate({
                path: "employeeId",
                populate: ["department", "designation", "primaryCentre"]
            })
            .populate("user", "name email")
            .sort({ createdAt: -1 });

        // Sign profile images
        const signedRequests = await Promise.all(requests.map(async (request) => {
            const reqObj = request.toObject();
            if (reqObj.employeeId && reqObj.employeeId.profileImage) {
                reqObj.employeeId.profileImage = await getSignedFileUrl(reqObj.employeeId.profileImage);
            }
            return reqObj;
        }));

        res.status(200).json(signedRequests);
    } catch (error) {
        console.error("Get All Requests Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// HR: Update resignation details (Last date, FNF)
export const updateResignationDetails = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { lastDateOfWork, fnfAmount, status, remarks } = req.body;

        const request = await ResignationRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ message: "Request not found." });
        }

        if (lastDateOfWork) request.lastDateOfWork = lastDateOfWork;
        if (fnfAmount !== undefined) request.fnfAmount = fnfAmount;
        if (status) {
            request.status = status;
            if (status === "Approved") request.approvedAt = new Date();
        }
        if (remarks) request.remarks = remarks;

        await request.save();
        res.status(200).json({ message: "Resignation details updated successfully.", request });
    } catch (error) {
        console.error("Update Request Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// HR: Delete request
export const deleteResignationRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        await ResignationRequest.findByIdAndDelete(requestId);
        res.status(200).json({ message: "Resignation request deleted successfully." });
    } catch (error) {
        console.error("Delete Request Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
