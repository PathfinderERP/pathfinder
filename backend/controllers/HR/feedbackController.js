import Feedback from "../../models/HR/Feedback.js";
import Employee from "../../models/HR/Employee.js";
import User from "../../models/User.js";
import { getSignedFileUrl } from "../../utils/r2Upload.js";

// Submit Feedback (Employee)
export const submitFeedback = async (req, res) => {
    try {
        const { subject, message, type } = req.body;

        // Find the employee record for this user
        const employee = await Employee.findOne({ user: req.user.id });
        if (!employee) {
            return res.status(404).json({ message: "Employee profile not found." });
        }

        const newFeedback = new Feedback({
            employee: employee._id,
            user: req.user.id,
            subject,
            message,
            type: type || "Feedback"
        });

        await newFeedback.save();
        res.status(201).json({ message: "Feedback submitted successfully.", feedback: newFeedback });
    } catch (error) {
        console.error("Submit Feedback Error:", error);
        res.status(500).json({ message: "Error submitting feedback." });
    }
};

// Get My Feedbacks (Employee)
export const getMyFeedbacks = async (req, res) => {
    try {
        const feedbacks = await Feedback.find({ user: req.user.id }).sort({ createdAt: -1 });

        const enrichedFeedbacks = await Promise.all(feedbacks.map(async (f) => {
            const feedObj = f.toObject();
            if (feedObj.respondedBy) {
                const responder = await Employee.findOne({ user: feedObj.respondedBy }).select("name profileImage");
                if (responder) {
                    feedObj.responderName = responder.name;
                    if (responder.profileImage) {
                        feedObj.responderImage = await getSignedFileUrl(responder.profileImage);
                    }
                }
            }
            return feedObj;
        }));

        res.status(200).json(enrichedFeedbacks);
    } catch (error) {
        console.error("Get My Feedbacks Error:", error);
        res.status(500).json({ message: "Error fetching your feedbacks." });
    }
};

// Get All Feedbacks (HR/Admin)
export const getAllFeedbacks = async (req, res) => {
    try {
        const feedbacks = await Feedback.find()
            .populate({
                path: "employee",
                select: "employeeId name profileImage department designation email phoneNumber",
                populate: [
                    { path: "department", select: "departmentName" },
                    { path: "designation", select: "name" }
                ]
            })
            .sort({ createdAt: -1 });

        const enrichedFeedbacks = await Promise.all(feedbacks.map(async (f) => {
            const feedObj = f.toObject();

            // Process Uploader Image
            if (feedObj.employee && feedObj.employee.profileImage) {
                feedObj.employee.profileImage = await getSignedFileUrl(feedObj.employee.profileImage);
            }

            // Process Responder Details if exists
            if (feedObj.respondedBy) {
                const responder = await Employee.findOne({ user: feedObj.respondedBy }).select("name profileImage");
                if (responder) {
                    feedObj.responderName = responder.name;
                    if (responder.profileImage) {
                        feedObj.responderImage = await getSignedFileUrl(responder.profileImage);
                    }
                }
            }
            return feedObj;
        }));

        res.status(200).json(enrichedFeedbacks);
    } catch (error) {
        console.error("Get All Feedbacks Error:", error);
        res.status(500).json({ message: "Error fetching all feedbacks." });
    }
};

// Respond to Feedback (HR/Admin)
export const respondToFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { response } = req.body;

        const feedback = await Feedback.findById(id);
        if (!feedback) return res.status(404).json({ message: "Feedback not found." });

        feedback.hrResponse = response;
        feedback.status = "Responded";
        feedback.respondedBy = req.user.id;
        feedback.respondedAt = Date.now();

        await feedback.save();
        res.status(200).json({ message: "Response submitted successfully.", feedback });
    } catch (error) {
        console.error("Respond Feedback Error:", error);
        res.status(500).json({ message: "Error submitting response." });
    }
};
